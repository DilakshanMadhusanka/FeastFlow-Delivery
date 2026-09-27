const fs = require('fs');
const { execSync } = require('child_process');

let content = fs.readFileSync('apps/api/src/app.ts', 'utf8');
content = content.replace('export function createApp(): Application {', 'export function createApp() {');
content = content.replace('const app: Application = express();', 'const app = express();');

fs.writeFileSync('apps/api/src/app.temp.ts', content);
try {
  execSync('npx tsc --skipLibCheck --noEmit apps/api/src/app.temp.ts', { stdio: 'pipe' });
  console.log('🎉🎉🎉 COMPILATION SUCCEEDED WITH const app = express() ! 🎉🎉🎉');
} catch (err) {
  const stderr = err.stderr ? err.stderr.toString() : '';
  if (stderr.includes('Maximum call stack size exceeded')) {
    console.log('Still stack overflow');
  } else {
    console.log('Output:', stderr.slice(0, 300));
  }
}
fs.unlinkSync('apps/api/src/app.temp.ts');
