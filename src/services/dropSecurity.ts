import crypto from 'crypto';

const DROP_TOKEN_HASH_SECRET = process.env.DROP_TOKEN_HASH_SECRET || process.env.JWT_SECRET || 'connect360-drop-token-hash';
const DROP_TOKEN_DERIVE_SECRET = process.env.DROP_TOKEN_DERIVE_SECRET || DROP_TOKEN_HASH_SECRET;

const URL_SAFE_RE = /^[A-Za-z0-9_-]+$/;
const MIN_TOKEN_BYTES = 16; // 128-bit minimum entropy
const MAX_TOKEN_BYTES = 64;

const toBase64Url = (buffer: Buffer): string =>
    buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

const fromBase64Url = (value: string): Buffer => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
    return Buffer.from(normalized + '='.repeat(padLen), 'base64');
};

const timingSafeEqualString = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    const maxLength = Math.max(leftBuffer.length, rightBuffer.length, 1);

    const leftPadded = Buffer.alloc(maxLength);
    const rightPadded = Buffer.alloc(maxLength);

    leftBuffer.copy(leftPadded);
    rightBuffer.copy(rightPadded);

    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftPadded, rightPadded);
};

export const generatePublicDropToken = (): string => toBase64Url(crypto.randomBytes(32));

export const derivePublicDropTokenForTag = (tagCode: string): string =>
    toBase64Url(
        crypto
            .createHmac('sha256', DROP_TOKEN_DERIVE_SECRET)
            .update(`drop:${tagCode}`)
            .digest()
    );

export const isValidDropTokenFormat = (token: string): boolean => {
    if (!token || token.length > 128 || !URL_SAFE_RE.test(token)) {
        return false;
    }

    let decoded: Buffer;
    try {
        decoded = fromBase64Url(token);
    } catch {
        return false;
    }

    if (decoded.length < MIN_TOKEN_BYTES || decoded.length > MAX_TOKEN_BYTES) {
        return false;
    }

    const canonical = toBase64Url(decoded);
    return timingSafeEqualString(token, canonical);
};

export const hashDropToken = (publicToken: string): string =>
    toBase64Url(crypto.createHmac('sha256', DROP_TOKEN_HASH_SECRET).update(publicToken).digest());

export const sanitizeDropContent = (content: string): string => {
    const collapsed = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    return collapsed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const getDropResponseJitterMs = (): number => 40 + Math.floor(Math.random() * 120);
