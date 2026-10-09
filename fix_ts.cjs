const fs = require('fs');

// Fix SettingsPage.tsx
let sp = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
if (!sp.includes("const [showNarcoticModal, setShowNarcoticModal]")) {
  sp = sp.replace("const [age, setAge] =", "const [showNarcoticModal, setShowNarcoticModal] = useState(false);\n  const [age, setAge] =");
}
// Fallback if setAge doesn't exist
if (!sp.includes("const [showNarcoticModal, setShowNarcoticModal]")) {
  sp = sp.replace("return (", "const [showNarcoticModal, setShowNarcoticModal] = useState(false);\n\n  return (");
}
fs.writeFileSync('src/pages/SettingsPage.tsx', sp, 'utf8');

// Fix DigitalNarcoticModal.tsx imports
let dnm = fs.readFileSync('src/components/shield/DigitalNarcoticModal.tsx', 'utf8');
dnm = dnm.replace(/import \{ ShieldAlert, Wind, X \} from 'lucide-react';/, "import { Wind } from 'lucide-react';");
dnm = dnm.replace(/import React, \{ useState, useEffect \} from 'react';/, "import { useState, useEffect } from 'react';");
fs.writeFileSync('src/components/shield/DigitalNarcoticModal.tsx', dnm, 'utf8');
