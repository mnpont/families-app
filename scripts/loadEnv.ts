/**
 * Loads .env.local the same way Vite does for the app itself -- these
 * standalone scripts run outside Vite (via tsx), so without this,
 * process.env only sees variables explicitly exported into the shell.
 * Import this for its side effect before reading process.env.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else {
  // Fall back to a plain .env if that's what's present instead.
  config();
}
