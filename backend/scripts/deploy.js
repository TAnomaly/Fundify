#!/usr/bin/env node

/**
 * Custom deploy script that mirrors `npm run deploy` but automatically
 * resolves the known Prisma migration failure (`P3009` for
 * `20250106000100_add_podcast_status_columns`) by marking it as rolled
 * back and retrying the migration once.
 */

const { spawnSync } = require('child_process');

const FAILED_MIGRATION_NAME = '20250106000100_add_podcast_status_columns';
const FAILED_MIGRATION_ERROR_CODE = 'P3009';

const defaultSpawnOptions = {
  env: process.env,
};

function runCommand(command, args, options = {}) {
  const spawnOptions = {
    ...defaultSpawnOptions,
    encoding: 'utf-8',
    stdio: 'pipe',
    ...options,
  };

  const result = spawnSync(command, args, spawnOptions);

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

function runOrExit(command, args, options) {
  const result = runCommand(command, args, options);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function migrationOutputContainsKnownFailure(stdout, stderr) {
  const combined = `${stdout ?? ''}${stderr ?? ''}`;
  return (
    combined.includes(FAILED_MIGRATION_ERROR_CODE) &&
    combined.includes(FAILED_MIGRATION_NAME)
  );
}

function attemptMigrationWithAutoResolve() {
  const migrateResult = runCommand('npx', ['prisma', 'migrate', 'deploy']);

  if (migrateResult.status === 0) {
    return;
  }

  if (!migrationOutputContainsKnownFailure(migrateResult.stdout, migrateResult.stderr)) {
    process.exit(migrateResult.status ?? 1);
  }

  console.log(
    `Detected failed migration record for ${FAILED_MIGRATION_NAME}. ` +
    'Attempting to mark it as rolled back and retry...',
  );

  const resolveResult = runCommand('npx', [
    'prisma',
    'migrate',
    'resolve',
    '--rolled-back',
    FAILED_MIGRATION_NAME,
  ]);

  if (resolveResult.status !== 0) {
    console.error('Failed to mark migration as rolled back. Aborting deployment.');
    process.exit(resolveResult.status ?? 1);
  }

  const retryResult = runCommand('npx', ['prisma', 'migrate', 'deploy']);
  if (retryResult.status !== 0) {
    process.exit(retryResult.status ?? 1);
  }
}

function main() {
  attemptMigrationWithAutoResolve();
  runOrExit('npx', ['prisma', 'generate']);

  const startResult = spawnSync('npm', ['start'], {
    ...defaultSpawnOptions,
    stdio: 'inherit',
  });

  process.exit(startResult.status ?? 1);
}

main();

