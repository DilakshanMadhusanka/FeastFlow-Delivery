const fs = require('fs');
const { execSync } = require('child_process');

const original = fs.readFileSync('apps/api/src/app.ts', 'utf8');

// Let's test binary search of sections in app.ts
const lines = original.split('\n');
console.log(`Total lines: ${lines.length}`);

// We want to find the exact minimal change that makes `tsc apps/api/src/app.ts` pass.
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim() || line.trim().startsWith('//')) continue;
  
  // Try commenting out this single line
  const modified = [...lines];
  modified[i] = `// ${line}`;
  fs.writeFileSync('apps/api/src/app.ts', modified.join('\n'));
  
  try {
    execSync('npx tsc --skipLibCheck --noEmit apps/api/src/app.ts', { stdio: 'pipe' });
    console.log(`🎯 PASS! Commenting out line ${i + 1} fixed it:`);
    console.log(`   ${line}`);
    break;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    if (!stderr.includes('Maximum call stack size exceeded')) {
      console.log(`⚡ Different error on line ${i + 1}: ${stderr.slice(0, 100)}`);
    }
  }
}

// Restore original
fs.writeFileSync('apps/api/src/app.ts', original);
console.log('Single line test completed.');
