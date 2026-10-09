const fs = require('fs');
let c = fs.readFileSync('src/pages/JournalPage.tsx', 'utf8');

c = c.replace(/placeholder=".*?\n\s*className=/s, 'placeholder="Bugün nasıl hissediyorsun? Neler yaşadın?"\n            className=');

fs.writeFileSync('src/pages/JournalPage.tsx', c, 'utf8');
