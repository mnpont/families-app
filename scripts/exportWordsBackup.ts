/**
 * Exports the live Supabase `words` table to a timestamped CSV in /backups,
 * as a rollback safety net before Phase 0 Step 2's schema migration and
 * backfill run against it.
 *
 * This script was NOT run by the assistant -- the session it was written in
 * has no Supabase credentials at all. Run it yourself:
 *
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx tsx scripts/exportWordsBackup.ts
 *
 * (or `export $(cat .env.local | xargs)` first if you keep them there).
 * Commit the resulting CSV, or note elsewhere where you're keeping it --
 * either way, do this BEFORE running scripts/backfillToV2Schema.ts live.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.');
  process.exit(1);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

  const { data, error } = await supabase.from('words').select('*').order('id', { ascending: true });

  if (error) {
    console.error('Failed to read `words` table:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('`words` table is empty -- nothing to back up.');
    return;
  }

  const columns = Object.keys(data[0]);
  const lines = [columns.join(',')];
  for (const row of data) {
    lines.push(columns.map((col) => csvEscape((row as Record<string, unknown>)[col])).join(','));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `words_backup_${timestamp}.csv`;
  const outPath = join(process.cwd(), 'backups', filename);
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

  console.log(`Backed up ${data.length} rows from \`words\` to backups/${filename}`);
}

main();
