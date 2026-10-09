const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

const start = content.indexOf('<div className="grid grid-cols-2 gap-2">');
const end = content.indexOf('<div className="pt-2">');

if (start !== -1 && end !== -1) {
    content = content.substring(0, start) + content.substring(end);
}

fs.writeFileSync('src/pages/ProfilePage.tsx', content, 'utf8');
