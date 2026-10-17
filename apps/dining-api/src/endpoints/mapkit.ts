import jwt from 'jsonwebtoken';
import Elysia from 'elysia';
import { env } from 'env';

function signMapkitToken(iat: number): string {
    const payload = {
        iat,
        exp: iat + env.MAPKIT_JS_TTL,
        iss: env.MAPKIT_JS_TEAM_ID,
        origin: env.MAPKIT_ALLOWED_ORIGINS,
    };
    const auth_key = Buffer.from(env.MAPKIT_JS_AUTH_KEY, 'base64').toString();
    const header = {
        typ: 'JWT',
        alg: 'ES256',
        kid: env.MAPKIT_JS_KEY_ID,
    };

    const token = jwt.sign(payload, auth_key, { header });
    console.info({
        title: 'MapKit JS token generated successfully',
        summary: `Origin: ${env.MAPKIT_ALLOWED_ORIGINS}, expires in ${env.MAPKIT_JS_TTL} seconds.`,
    });

    return token;
}

export const mapkitEndpoints = new Elysia();

mapkitEndpoints.get(
    '/mapkit-token',
    () => {
        const iat = Math.floor(Date.now() / 1000);
        return { token: signMapkitToken(iat) };
    },
    {
        response: {
            200: t.Object({ token: t.String() }),
            403: t.String(),
        },
        detail: {
            description: 'Return a short-lived MapKit JWT scoped to MAPKIT_ALLOWED_ORIGINS for the frontend.',
        },
    },
);
