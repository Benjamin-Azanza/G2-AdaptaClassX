import * as dotenv from 'dotenv';
import path from 'path';

// Forzamos la lectura manual del archivo .env localizado en la raíz del backend
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
};