const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const importAdd = "import { JournalPage } from './pages/JournalPage';\n";
app = app.replace(/import \{ SettingsPage \} from '\.\/pages\/SettingsPage';\n/, "import { SettingsPage } from './pages/SettingsPage';\n" + importAdd);

const routeAdd = '<Route path="/journal" element={<JournalPage />} />\n                ';
app = app.replace(/<Route path="\/settings" element=\{<SettingsPage \/>\} \/>\n/, "<Route path=\"/settings\" element={<SettingsPage />} />\n                " + routeAdd);

fs.writeFileSync('src/App.tsx', app, 'utf8');
