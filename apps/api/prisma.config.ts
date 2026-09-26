import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, env } from 'prisma/config';

// Load environment variables when Prisma CLI runs from the API workspace or repository root.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});