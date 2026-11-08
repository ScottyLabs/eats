import jwt from 'jsonwebtoken';
import { env } from 'env';

export function mapkitOrigins(allowedOrigins: string, appUrl: string | undefined): string {
    const origins = [...allowedOrigins.split(','), appUrl ?? '']
        .map((value) => value.trim())
        .filter((value) => /^https?:\/\//.test(value))
        .map((value) => new URL(value).origin);

    return [...new Set(origins)].join(',');
}

export function signMapkitToken(): string {
    const iat = Math.floor(Date.now() / 1000);

    return jwt.sign(
        {
            iat,
            exp: iat + env.MAPKIT_JS_TTL,
            iss: env.MAPKIT_JS_TEAM_ID,
            origin: mapkitOrigins(env.MAPKIT_ALLOWED_ORIGINS, env.APP_URL),
        },
        atob(env.MAPKIT_JS_AUTH_KEY),
        { header: { typ: 'JWT', alg: 'ES256', kid: env.MAPKIT_JS_KEY_ID } },
    );
}
