const fs = require('fs');
const path = require('path');

const cleanups = [
  { from: /Ş\x9E/g, to: 'Ş' },
  { from: /ş\x9F/g, to: 'ş' },
  { from: /ç\xA7/g, to: 'ç' },
  { from: /Ç\x87/g, to: 'Ç' },
  { from: /ü\xBC/g, to: 'ü' },
  { from: /Ü\x9C/g, to: 'Ü' },
  { from: /ö\xB6/g, to: 'ö' },
  { from: /Ö\x96/g, to: 'Ö' },
  { from: /ğ\x9F/g, to: 'ğ' },
  { from: /Ğ\x9E/g, to: 'Ğ' },
  { from: /ı\xB1/g, to: 'ı' },
  { from: /İ\xB0/g, to: 'İ' },
  { from: /â€¢/g, to: '•' },
  { from: /^\uFEFF/, to: '' } // Remove BOM
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        processDirectory(fullPath);
      }
    } else if (/\.(tsx|ts|js|jsx|json|html)$/.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of cleanups) {
        if (r.from.test(content)) {
          content = content.replace(r.from, r.to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, { encoding: 'utf8' });
        console.log(`Temizlendi: ${fullPath}`);
      }
    }
  }
}

processDirectory('./src');
processDirectory('./public');
console.log('Ekstra bozukluklar temizlendi.');
