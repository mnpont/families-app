/**
 * Node-side wiring for supabase/functions/_shared/conjugationCore.ts: loads
 * the same conjugation library the generate-conjugations Edge Function
 * imports through `npm:` specifiers, pinned to the same versions in
 * package.json (devDependencies), so the backfill and the tests produce
 * byte-for-byte what the Edge Function would.
 */
import { createRequire } from 'node:module';
import { getConjugation } from 'french-verbs';
import { isHMuet } from 'french-contractions';
import {
  applyLefffPatches,
  createFrenchConjugator,
  type FrenchConjugator,
  type GetConjugationFn,
  type LefffData,
} from '../supabase/functions/_shared/conjugationCore';

let cached: FrenchConjugator | null = null;

export function loadFrenchConjugator(): FrenchConjugator {
  if (cached) return cached;
  // A 6 MB JSON file -- required rather than imported so no tsconfig needs
  // resolveJsonModule just for this.
  const require = createRequire(import.meta.url);
  const lefff = require('french-verbs-lefff/dist/conjugations.json') as LefffData;
  applyLefffPatches(lefff);
  cached = createFrenchConjugator({
    lefff,
    getConjugation: getConjugation as unknown as GetConjugationFn,
    isHMuet,
  });
  return cached;
}
