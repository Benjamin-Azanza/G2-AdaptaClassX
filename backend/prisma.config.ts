import * as dotenv from 'dotenv';
import path from 'path';

// Forzamos la lectura manual del archivo .env localizado en la raíz del backend
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default {
  // Prisma 7 reads connection URLs from this config (not from `schema.prisma`).
  // Use DIRECT_URL for Migrate so DDL doesn't go through the PgBouncer pool.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
};