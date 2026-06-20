import fs from 'fs';
import path from 'path';

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const files = walk('c:/workspace/Meus Projetos/Centro Automotivo APP/App Centro Automotivo/client/src');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('new Date().toISOString()')) {
    count++;
    changed = true;
    
    // Replace .split('T')[0] pattern specifically to .format("YYYY-MM-DD")
    content = content.replace(/new Date\(\)\.toISOString\(\)\.split\(['"]T['"]\)?\[0\]/g, 'dayjs().tz("America/Sao_Paulo").format("YYYY-MM-DD")');
    
    // Replace remaining .toISOString() pattern to .format()
    content = content.replace(/new Date\(\)\.toISOString\(\)/g, 'dayjs().tz("America/Sao_Paulo").format()');
    
    // Also fix getSyncedDate().toISOString().split("T")[0] specifically
    content = content.replace(/getSyncedDate\(\)\.toISOString\(\)\.split\(['"]T['"]\)\[0\]/g, 'dayjs(getSyncedDate()).tz("America/Sao_Paulo").format("YYYY-MM-DD")');
  }

  // Also catch getSyncedDate alone if it wasn't caught
  if (content.includes('getSyncedDate().toISOString().split') && !changed) {
    count++;
    changed = true;
    content = content.replace(/getSyncedDate\(\)\.toISOString\(\)\.split\(['"]T['"]\)\[0\]/g, 'dayjs(getSyncedDate()).tz("America/Sao_Paulo").format("YYYY-MM-DD")');
  }
  
  if (changed) {
    // Check if dayjs is imported
    if (!content.includes('import dayjs from "dayjs"') && !content.includes("import dayjs from 'dayjs'")) {
      // Find the last import and add our imports after it
      const imports = [
        'import dayjs from "dayjs";',
        'import utc from "dayjs/plugin/utc";',
        'import timezone from "dayjs/plugin/timezone";',
        'dayjs.extend(utc);',
        'dayjs.extend(timezone);'
      ].join('\n');
      
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, imports);
        content = lines.join('\n');
      } else {
        content = imports + '\n' + content;
      }
    }
    
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
  }
}
console.log('Total files updated:', count);
