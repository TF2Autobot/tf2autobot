import jwt from 'jsonwebtoken';

export const REFRESH_TOKEN_EXPIRY_LEEWAY_SECONDS = 60;

interface RefreshTokenPayload {
    exp?: unknown;
}

export function isUsableRefreshToken(
    refreshToken: string,
    nowSeconds = Date.now() / 1000,
    leewaySeconds = REFRESH_TOKEN_EXPIRY_LEEWAY_SECONDS
): boolean {
    try {
        const decoded = jwt.decode(refreshToken, { complete: true });

        if (!decoded || typeof decoded.payload !== 'object' || decoded.payload === null) {
            return false;
        }

        const { exp } = decoded.payload as RefreshTokenPayload;

        return typeof exp === 'number' && Number.isFinite(exp) && exp > nowSeconds + leewaySeconds;
    } catch {
        return false;
    }
}
