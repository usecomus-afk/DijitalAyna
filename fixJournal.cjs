const fs = require('fs');
let c = fs.readFileSync('src/pages/JournalPage.tsx', 'utf8');

c = c.replace(/BugǬn/g, 'Bugün');
c = c.replace(/nasl/g, 'nasıl');
c = c.replace(/yaYadn-/g, 'yaşadın?"');

fs.writeFileSync('src/pages/JournalPage.tsx', c, 'utf8');
