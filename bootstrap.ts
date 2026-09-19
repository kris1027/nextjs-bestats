import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import { envValue, withEnvValue } from './lib/env-file.ts';

/**
 * Everything setup can do without a person, in the order it has to happen:
 * `.env.local` from `.env.example`, Neon's variables from the branch `.neon`
 * pins, a cookie secret where there is none, then `db:check` against the
 * database that names. Safe to run again: each step fills only what is
 * missing, and `neon env pull` rewrites its own variables and no others.
 *
 * Two things stay the person's. The TMDB token is theirs to paste, and
 * migrations are applied by running `pnpm db:migrate` on purpose — `main` is
 * production, so this script says what is pending and never runs it.
 *
 * A plain Node script, run by type stripping for the reason `db-check.ts` is,
 * so it reaches `lib/` by a relative path with the extension included.
 */

const ENV_FILE = '.env.local';

/** Runs a command with the terminal handed to it, since `neon` may ask the
 * person to sign in; answers whether it succeeded. */
const run = (command: string, args: string[]): boolean =>
  spawnSync(command, args, { stdio: 'inherit' }).status === 0;

if (!existsSync(ENV_FILE)) {
  copyFileSync('.env.example', ENV_FILE);
  console.log(`Created ${ENV_FILE} from .env.example.`);
}

if (!run('pnpm', ['exec', 'neon', 'env', 'pull', '--file', ENV_FILE])) {
  console.error(
    [
      '',
      "Could not pull the branch's variables from Neon.",
      'Sign in with `pnpm exec neon auth`, then run `pnpm bootstrap` again.',
    ].join('\n'),
  );
  process.exit(1);
}

let env = readFileSync(ENV_FILE, 'utf8');

if (!envValue(env, 'NEON_AUTH_COOKIE_SECRET')) {
  env = withEnvValue(
    env,
    'NEON_AUTH_COOKIE_SECRET',
    randomBytes(32).toString('base64'),
  );
  writeFileSync(ENV_FILE, env);
  console.log('Generated NEON_AUTH_COOKIE_SECRET.');
}

console.log('');
const migrated = run('pnpm', ['db:check']);
const tokened = envValue(env, 'TMDB_API_TOKEN') !== null;

const left = [
  tokened
    ? null
    : `Paste a TMDB read access token into ${ENV_FILE} as TMDB_API_TOKEN — https://www.themoviedb.org/settings/api`,
  migrated
    ? null
    : 'Apply the pending migrations with `pnpm db:migrate`, on purpose: main is production.',
].filter((step) => step !== null);

console.log('');

if (left.length === 0) {
  console.log('Ready. Start the app with `pnpm dev`.');
} else {
  console.log('Left to do, then `pnpm dev`:');
  for (const step of left) console.log(`- ${step}`);
  process.exit(1);
}
