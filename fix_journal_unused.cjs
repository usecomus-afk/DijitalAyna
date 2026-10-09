const fs = require('fs');
let jp = fs.readFileSync('src/pages/JournalPage.tsx', 'utf8');
jp = jp.replace(/Trash2, /, '');
fs.writeFileSync('src/pages/JournalPage.tsx', jp, 'utf8');
