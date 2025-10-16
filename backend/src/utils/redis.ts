import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
    if (redis) return redis;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
    });
    redis.on('error', (err) => {
        console.error('Redis error:', err.message);
    });
    return redis;
}

export async function safeCacheGet<T = unknown>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;
    try {
        const raw = await client.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch (_) {
        return null;
    }
}

export async function safeCacheSet(
    key: string,
    value: unknown,
    ttlSeconds = 300
): Promise<void> {
    const client = getRedis();
    if (!client) return;
    try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (_) {
        // ignore cache set failures
    }
}


