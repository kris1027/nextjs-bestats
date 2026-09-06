import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit is not Next, and does not read `.env.local` on its own
config({ path: '.env.local', quiet: true });

const url = process.env.DATABASE_URL;

if (!url) throw new Error('Missing DATABASE_URL');

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/schema.ts',
  out: './drizzle',
  // Neon Auth owns `neon_auth`; drizzle-kit manages `public` and nothing else
  schemaFilter: ['public'],
  // the cross-schema foreign key lives in a custom migration, so leave the
  // constraint alone rather than dropping what generation cannot see
  dbCredentials: { url },
});
