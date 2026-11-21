import { z } from 'zod';

const envSchema = z.object({
    PUBLIC_API_URL: z
        .url()
        .transform((url) => {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}`;
        })
        .or(z.literal('local'))
        .default(''),
    PUBLIC_POSTHOG_KEY: z.string().optional(),
    PUBLIC_POSTHOG_HOST: z.string().optional(),
});

const response = await fetch('/_kennel/env.json');
const env = envSchema.parse(await response.json());
export default env;
