import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '@/lib/schema';

const connection = (): string => {
  const url = process.env.DATABASE_URL;

  if (!url) throw new Error('Missing DATABASE_URL');

  return url;
};

/**
 * The Drizzle client, over Neon's HTTP driver. That driver has no interactive
 * transactions, which is why the integration suite runs against a real Neon
 * branch rather than a local Postgres that would let it roll back.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 */
export const db = drizzle(neon(connection()), { schema });
