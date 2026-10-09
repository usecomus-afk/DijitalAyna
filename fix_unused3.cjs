const fs = require('fs');

let qm = fs.readFileSync('src/components/dashboard/QuickMoodWidget.tsx', 'utf8');
qm = qm.replace(/import \{ useAppStore \} from '\.\.\/\.\.\/store\/useAppStore';\n/, '');
fs.writeFileSync('src/components/dashboard/QuickMoodWidget.tsx', qm, 'utf8');

let tp = fs.readFileSync('src/pages/TriggersPage.tsx', 'utf8');
tp = tp.replace(/import \{ useAppStore \} from '\.\.\/store\/useAppStore';\n/, '');
fs.writeFileSync('src/pages/TriggersPage.tsx', tp, 'utf8');

