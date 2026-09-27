const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      results.push(full);
    }
  });
  return results;
}

const files = getFiles('apps/api/src');
console.log(`Checking ${files.length} files...`);

for (const f of files) {
  try {
    execSync(`npx tsc --skipLibCheck --noEmit "${f}"`, { stdio: 'pipe' });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    if (stderr.includes('Maximum call stack size exceeded')) {
      console.log(`🔥 FOUND CRASHING FILE: ${f}`);
      console.log(stderr.slice(0, 300));
      process.exit(0);
    }
  }
}
console.log('No single file crashed alone.');
