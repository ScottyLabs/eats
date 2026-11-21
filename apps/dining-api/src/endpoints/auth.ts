import { createUserSession, fetchUserSession } from 'db/auth';
import { db } from 'db/db';
import Elysia, { status, t } from 'elysia';
import { env } from 'env';
import { jwtDecode } from 'jwt-decode';
import * as client from 'openid-client';
import { notifySlack } from 'utils/slack';
import cookieSigner from 'cookie-signature';

const OIDCConfig = await client.discovery(
    new URL(`${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}`),
    env.OIDC_CLIENT_ID,
    env.OIDC_CLIENT_SECRET,
);
export const authEndpoints = new Elysia();
authEndpoints.get(
    '/login',
    async ({ cookie, query }) => {
        const originalOrigin = query.redirectURL;
        if (originalOrigin === null) return new Response(null, { status: 403 });
        cookie['original_origin']!.value = originalOrigin;
        const state = Buffer.from(
            JSON.stringify({ return_to: `${env.APP_URL}/code-exchange`, csrf: crypto.randomUUID() }),
        ).toString('base64url');
        cookie['oauth_state']!.value = state;
        const codeVerifier = client.randomPKCECodeVerifier();
        cookie['pkce_verifier']!.value = codeVerifier;
        const redirectURL = client.buildAuthorizationUrl(OIDCConfig, {
            redirect_uri: env.OAUTH_RELAY_URL,
            scope: 'openid email profile',
            state,
            code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
            code_challenge_method: 'S256',
        });
        return new Response(null, {
            status: 303,
            headers: {
                Location: redirectURL.href,
            },
        });
    },
    {
        query: t.Object({ redirectURL: t.Nullable(t.String()) }),
        detail: { hide: true },
    },
);
authEndpoints.get(
    '/logout',
    ({ cookie, request, query }) => {
        const originalOrigin = query.redirectURL;
        if (originalOrigin === null) return new Response(null, { status: 403 });

        cookie['session_id']!.remove();
        return new Response(null, {
            status: 303,
            headers: {
                Location: originalOrigin,
            },
        });
    },
    {
        query: t.Object({ redirectURL: t.Nullable(t.String()) }),
        detail: { hide: true },
    },
);
authEndpoints.get(
    '/code-exchange',
    async ({ request, cookie }) => {
        const originalOrigin = cookie['original_origin']!.value as string;
        cookie['original_origin']!.remove();
        const expectedState = cookie['oauth_state']!.value as string;
        cookie['oauth_state']!.remove();
        const pkceCodeVerifier = cookie['pkce_verifier']!.value as string;
        cookie['pkce_verifier']!.remove();

        // redirect_uri must match the relay's
        const callbackURL = new URL(env.OAUTH_RELAY_URL);
        callbackURL.search = new URL(request.url).search;
        const tokens = await client
            .authorizationCodeGrant(OIDCConfig, callbackURL, { expectedState, pkceCodeVerifier })
            .catch((e) => {
                console.error(e);
                notifySlack(
                    `<!channel> OIDC code exchange failed with error ${e} ${JSON.stringify(e.cause)} CODE: ${e.code}`,
                );
                return undefined;
            });
        if (tokens?.id_token !== undefined) {
            const jwt = jwtDecode(tokens.id_token) as Record<string, string>;

            const sessionId = await createUserSession(db, {
                email: jwt.email,
                firstName: jwt.given_name ?? jwt.name,
                lastName: jwt.family_name,
                googleId: jwt.sub,
                pfpURL: jwt.picture,
            });
            if (sessionId !== undefined) {
                cookie['session_id']!.value = cookieSigner.sign(sessionId, env.SESSION_COOKIE_SIGNING_SECRET);
                cookie['session_id']!.httpOnly = true;
                cookie['session_id']!.secure = true;
                cookie['session_id']!.maxAge = 30 * 24 * 60 * 60; // 30 days
                cookie['session_id']!.sameSite = env.ENV === 'prod' ? 'strict' : 'none';
                console.log('created session', sessionId);
                return new Response(null, {
                    status: 303,
                    headers: {
                        Location: originalOrigin,
                    },
                });
            }
        }
        return new Response(null, {
            status: 303,
            headers: {
                Location: originalOrigin + '?AUTH_FAILED',
            },
        });
    },
    { query: t.Object({ code: t.String(), state: t.String() }), detail: { hide: true } },
);
export async function fetchUserDetails(sessionId?: string) {
    if (env.HARDCODE_SESSION_FOR_DEV_TESTING) sessionId = env.HARDCODE_SESSION_FOR_DEV_TESTING;
    if (sessionId === undefined) return null;
    const unsignedSessionId = cookieSigner.unsign(sessionId, env.SESSION_COOKIE_SIGNING_SECRET);
    if (!unsignedSessionId) return null;
    return await fetchUserSession(db, unsignedSessionId);
}
/**
 * Use as follows: app.use(protectedRoute().get("", ({ user }) => user.id));
 */
export const protectedRoute = () => {
    return new Elysia().resolve(async ({ cookie }) => {
        const session = cookie['session_id']!.value as string | undefined;
        const userDetails = await fetchUserDetails(session);
        if (userDetails === null) return status(401);

        return {
            user: userDetails,
        };
    });
};

authEndpoints.get(
    '/whoami',
    async ({ cookie }) => {
        return {
            user: await fetchUserDetails(cookie['session_id']!.value as string),
        };
    },
    {
        response: t.Object({
            user: t.Nullable(
                t.Object({
                    googleId: t.String(),
                    id: t.Number(),
                    email: t.String(),
                    firstName: t.Nullable(t.String()),
                    lastName: t.Nullable(t.String()),
                    pictureUrl: t.Nullable(t.String()),
                }),
            ),
        }),
        detail: {
            description:
                'If you have an active login session with cmueats, this will return your user info. (this is NOT intended to work cross-site)',
        },
    },
);
