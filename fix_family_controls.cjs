const fs = require('fs');

// 1. Remove from App.entitlements
let ent = fs.readFileSync('ios/App/App/App.entitlements', 'utf8');
ent = ent.replace(/\s*<key>com\.apple\.developer\.family-controls<\/key>\s*<true\/>/, '');
fs.writeFileSync('ios/App/App/App.entitlements', ent);

// 2. Remove from project.pbxproj
let pbx = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
pbx = pbx.replace(/\s*com\.apple\.FamilyControls = \{\s*enabled = 1;\s*\};/, '');
fs.writeFileSync('ios/App/App.xcodeproj/project.pbxproj', pbx);

console.log("Removed Family Controls entitlements");
