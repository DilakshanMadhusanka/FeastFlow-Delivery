const fs = require('fs');
const { execSync } = require('child_process');

let content = fs.readFileSync('apps/api/src/app.ts', 'utf8');
content = content.replace(
  'app.use((req: Request) => {',
  'app.use((req: Request, _res: Response, _next) => {'
);
fs.writeFileSync('apps/api/src/app.temp.ts', content);
try {
  execSync('npx tsc --skipLibCheck --noEmit apps/api/src/app.temp.ts', { stdio: 'pipe' });
  console.log('🎉🎉🎉 COMPILATION SUCCEEDED WITH 0 ERRORS! 🎉🎉🎉');
} catch (err) {
  const stderr = err.stderr ? err.stderr.toString() : '';
  console.log('Error:', stderr);
}
fs.unlinkSync('apps/api/src/app.temp.ts');
