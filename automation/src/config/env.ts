import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  BACKEND_BASE_URL: z.string().url().default("http://localhost:8000"),
  AUTOMATION_API_KEY: z.string().optional(),
  HEADLESS: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  SLOW_MO_MS: z
    .string()
    .default("0")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(0)),
  BROWSER_CHANNEL: z.enum(["chromium", "firefox", "webkit"]).default("chromium"),
  SESSION_DIR: z.string().default("storage-state"),
  SCREENSHOT_DIR: z.string().default("screenshots"),
  DOWNLOAD_DIR: z.string().default("downloads")
});

export const env = EnvSchema.parse(process.env);
