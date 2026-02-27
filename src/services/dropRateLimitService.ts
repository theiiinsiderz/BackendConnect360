import crypto from 'crypto';

type RateBucket = {
    count: number;
    resetAt: number;
};

const RATE_LIMIT_SECRET = process.env.DROP_RATE_LIMIT_SECRET || process.env.JWT_SECRET || 'connect360-drop-rate-limit';

const buckets = new Map<string, RateBucket>();

const hashIdentifier = (value: string): string =>
    crypto.createHmac('sha256', RATE_LIMIT_SECRET).update(value).digest('hex');

const nowMs = (): number => Date.now();

export const consumeRateLimit = (
    scope: string,
    rawIdentifier: string,
    maxInWindow: number,
    windowMs: number
): boolean => {
    const key = `${scope}:${hashIdentifier(rawIdentifier || 'unknown')}`;
    const now = nowMs();

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
        buckets.set(key, {
            count: 1,
            resetAt: now + windowMs,
        });
        return true;
    }

    if (current.count >= maxInWindow) {
        return false;
    }

    current.count += 1;
    buckets.set(key, current);
    return true;
};

export const pruneRateLimitBuckets = (): void => {
    const now = nowMs();
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
};

setInterval(pruneRateLimitBuckets, 5 * 60 * 1000).unref();
