import fs from 'fs';
import path from 'path';

function checkDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDirectory(fullPath);
    } else if (file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const dirOfFile = path.dirname(fullPath);
        const resolvedBase = path.resolve(dirOfFile, importPath);
        
        // Check if file exists with .ts, /index.ts, etc.
        let targetFile = '';
        if (fs.existsSync(resolvedBase + '.ts')) targetFile = resolvedBase + '.ts';
        else if (fs.existsSync(resolvedBase + '/index.ts')) targetFile = resolvedBase + '/index.ts';
        else if (fs.existsSync(resolvedBase)) targetFile = resolvedBase;
        
        if (targetFile) {
          // Compare actual casing of disk path
          const actualDir = path.dirname(targetFile);
          const actualFiles = fs.readdirSync(actualDir);
          const baseName = path.basename(targetFile);
          if (!actualFiles.includes(baseName)) {
            console.error(`❌ Case mismatch in ${fullPath}: imported "${importPath}", but disk has "${actualFiles.find(f => f.toLowerCase() === baseName.toLowerCase())}"`);
          }
        } else {
          console.warn(`⚠️ Unresolved relative import in ${fullPath}: "${importPath}"`);
        }
      }
    }
  }
}

checkDirectory('F:/food-delivery-app-native/apps/api/src');
checkDirectory('F:/food-delivery-app-native/api');
console.log('✅ Casing check completed.');
