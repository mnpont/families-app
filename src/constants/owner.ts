/**
 * Single shared user profile, per docs/v2-plan.md Section 3 (no auth yet).
 * Tables that will eventually need per-user state carry this as their
 * owner/user id from day one, so introducing real accounts later is a
 * data backfill, not a schema migration. Must match the DEFAULT used in
 * /migrations/006_create_decks.sql.
 */
export const OWNER_ID = '00000000-0000-0000-0000-000000000001';
