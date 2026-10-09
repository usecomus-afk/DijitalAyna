const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

// Remove the whole Cinsiyet block in edit mode
const start = content.indexOf('<label className="text-xs font-bold text-comus-navy block">\n                  Cinsiyet:\n                </label>');
if (start !== -1) {
    const end = content.indexOf('</div>\n              </div>\n\n              <div className="pt-2">');
    if (end !== -1) {
        content = content.substring(0, start) + content.substring(end);
    }
}
fs.writeFileSync('src/pages/ProfilePage.tsx', content, 'utf8');
