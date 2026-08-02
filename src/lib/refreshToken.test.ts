import { isUsableRefreshToken, REFRESH_TOKEN_EXPIRY_LEEWAY_SECONDS } from './refreshToken';
import { it, expect, describe } from 'vitest';

const now = 1_700_000_000;

function tokenWithPayload(payload: object): string {
    const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('isUsableRefreshToken', () => {
    it.each([
        ['malformed token', 'not-a-jwt', false],
        ['missing expiry', tokenWithPayload({}), false],
        ['string expiry', tokenWithPayload({ exp: String(now + 600) }), false],
        ['expired token', tokenWithPayload({ exp: now - 1 }), false],
        ['token inside the safety buffer', tokenWithPayload({ exp: now + REFRESH_TOKEN_EXPIRY_LEEWAY_SECONDS }), false],
        ['valid token', tokenWithPayload({ exp: now + 600 }), true]
    ])('returns %s for %s', (_name, token, expected) => {
        expect(isUsableRefreshToken(token, now)).toBe(expected);
    });
});
