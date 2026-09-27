const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('apps/api/src/app.ts', 'utf8');

const tests = [
  { name: 'without errorHandler', pattern: 'app.use(errorHandler);' },
  { name: 'without 404 handler', pattern: 'app.use((req: Request) => {' },
  { name: 'without cors', pattern: 'app.use(\n    cors(' },
  { name: 'without url normalizer', pattern: 'app.use((req: Request, _res: Response, next) => {' },
  { name: 'without helmet', pattern: 'app.use(helmet(' },
  { name: 'without morgan', pattern: 'app.use(morgan(' },
  { name: 'without get /', pattern: "app.get('/'," },
  { name: 'without get /health', pattern: "app.get('/health'," },
];

for (const t of tests) {
  let modified = content;
  // Comment out lines containing pattern
  const lines = modified.split('\n');
  const filtered = lines.filter(l => !l.includes(t.pattern.split('\n')[0]));
  fs.writeFileSync('apps/api/src/app.temp.ts', filtered.join('\n'));
  try {
    execSync('npx tsc --skipLibCheck --noEmit apps/api/src/app.temp.ts', { stdio: 'pipe' });
    console.log(`🎉 FIXED WHEN REMOVING: ${t.name}`);
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    if (!stderr.includes('Maximum call stack size exceeded')) {
      console.log(`🎉 NO LONGER STACK OVERFLOW when removing: ${t.name} (Other error: ${stderr.slice(0, 100)})`);
    }
  }
}
if (fs.existsSync('apps/api/src/app.temp.ts')) fs.unlinkSync('apps/api/src/app.temp.ts');
console.log('Testing done.');
