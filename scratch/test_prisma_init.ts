import { PrismaPg } from '@prisma/adapter-pg';

try {
  const adapter = new PrismaPg({ connectionString: 'postgresql://postgres:postgres@localhost:5432/test' } as any);
  console.log('Adapter with object succeeded:', adapter);
} catch (err) {
  console.error('Adapter with object failed:', err);
}
