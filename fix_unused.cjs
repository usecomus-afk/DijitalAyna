const fs = require('fs');

let qm = fs.readFileSync('src/components/dashboard/QuickMoodWidget.tsx', 'utf8');
qm = qm.replace(/const \{ userProfile \} = useAppStore\(\);\n  const avatarMap = getAvatarMap\(\);/, 'const avatarMap = getAvatarMap();');
fs.writeFileSync('src/components/dashboard/QuickMoodWidget.tsx', qm, 'utf8');

let tp = fs.readFileSync('src/pages/TriggersPage.tsx', 'utf8');
tp = tp.replace(/const \{ userProfile \} = useAppStore\(\);\n  const avatarMap = getAvatarMap\(\);/, 'const avatarMap = getAvatarMap();');
fs.writeFileSync('src/pages/TriggersPage.tsx', tp, 'utf8');

let pp = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');
pp = pp.replace(/import \{ getAvatarByScore \} from '\.\.\/constants\/avatars';\n/, '');
fs.writeFileSync('src/pages/ProfilePage.tsx', pp, 'utf8');

