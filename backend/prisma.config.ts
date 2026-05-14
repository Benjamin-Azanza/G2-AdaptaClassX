import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * - `url`       → Transaction pooler (Supabase pgbouncer). Used by the app at runtime.
 * - `directUrl` → Session / direct connection. Used by `prisma migrate deploy` which
 *                 requires a persistent connection that pgbouncer can't provide.
 *
 * For local dev without Supabase, both can point to the same DATABASE_URL.
 * DIRECT_URL only needs to differ in production (Supabase).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
    // directUrl is used for migrations to bypass pgbouncer on Supabase.
    // Falls back to DATABASE_URL if not set (fine for local dev and Railway).
    ...(process.env.DIRECT_URL ? { directUrl: process.env.DIRECT_URL } : {}),
  },
});
