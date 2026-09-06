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
  dbCredentials: { url },
});
