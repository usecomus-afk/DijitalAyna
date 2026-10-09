const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

const start = content.indexOf('<div className="space-y-1">\n              <label className="text-xs font-semibold text-comus-navy block">Cinsiyet:</label>');
const end = content.indexOf('<div className="flex justify-end gap-2 pt-2">');

if (start !== -1 && end !== -1) {
    content = content.substring(0, start) + content.substring(end);
}

fs.writeFileSync('src/pages/ProfilePage.tsx', content, 'utf8');
