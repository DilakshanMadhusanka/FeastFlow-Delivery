import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getAllTsFiles('apps/api/src');
console.log(`Found ${files.length} files to test.`);

for (const file of files) {
  try {
    execSync(`npx tsc --skipLibCheck --module Node16 --moduleResolution Node16 --target ES2022 --noEmit ${file}`, {
      stdio: 'pipe'
    });
  } catch (err: any) {
    const out = (err.stderr?.toString() || err.stdout?.toString() || '');
    if (out.includes('Maximum call stack size exceeded')) {
      console.error(`💥 CRASH TRIGGERED BY: ${file}`);
      console.error(out.slice(0, 500));
    }
  }
}
console.log('Testing finished.');
