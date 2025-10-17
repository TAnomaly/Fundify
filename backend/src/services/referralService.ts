import crypto from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const normalizeReferralCode = (code: string): string => code.trim().toUpperCase();

export const generateReferralCode = (length = 8): string => {
  const bytes = crypto.randomBytes(length);
  const chars = [] as string[];

  for (let i = 0; i < length; i += 1) {
    const index = bytes[i] % CHARSET.length;
    chars.push(CHARSET[index]);
  }

  return chars.join('');
};
