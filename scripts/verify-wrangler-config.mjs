#!/usr/bin/env node
/**
 * Pre-deploy check: wrangler.jsonc must not contain placeholder KV IDs.
 * Secrets (SUPABASE_JWT_SECRET, etc.) must be set via `wrangler secret put` — see README.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "wrangler.jsonc");
const raw = readFileSync(configPath, "utf8");

const errors = [];

if (/REPLACE_ME/i.test(raw)) {
  errors.push(
    "wrangler.jsonc contains REPLACE_ME_* placeholders. Run:\n" +
      "  wrangler kv namespace create GOJITO_KV\n" +
      "  wrangler kv namespace create GOJITO_KV --preview\n" +
      "  …and paste namespace IDs into wrangler.jsonc",
  );
}

const supabaseUrlMatch = raw.match(/"SUPABASE_URL"\s*:\s*"([^"]*)"/);
if (supabaseUrlMatch && !supabaseUrlMatch[1].trim()) {
  errors.push(
    'wrangler.jsonc vars.SUPABASE_URL is empty. Set your Supabase project URL before deploy.',
  );
}

if (errors.length > 0) {
  console.error("[gojito-backend] Deploy verification failed:\n");
  for (const msg of errors) {
    console.error(`  - ${msg}\n`);
  }
  process.exit(1);
}

console.log("[gojito-backend] wrangler.jsonc verification passed.");
