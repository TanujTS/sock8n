import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
    N8N_WEBHOOK_URL: z.string().url("N8N_WEBHOOK_URL must be a valid URL"),
    PORT: z.coerce.number().default(8080),
});

export const ENV = envSchema.parse(process.env);
