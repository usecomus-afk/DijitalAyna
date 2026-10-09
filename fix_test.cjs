const fs = require('fs');
let t = fs.readFileSync('src/constants/__tests__/avatars.test.ts', 'utf8');
t = "import { describe, it, expect } from 'vitest';\n" + t;
fs.writeFileSync('src/constants/__tests__/avatars.test.ts', t, 'utf8');
