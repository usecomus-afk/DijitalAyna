const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

// Remove the readonly Gender bento box
content = content.replace(/<div className="bg-slate-50\/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-1">\s*<span className="text-\[10px\] font-semibold text-slate-400 uppercase tracking-wider">Cinsiyet<\/span>[\s\S]*?<\/div>/, '');

// Remove the edit gender UI
const editGenderStart = content.indexOf('<div className="space-y-1.5">');
const editGenderEnd = content.indexOf('</div>\n              </div>\n\n              <div className="pt-2">');
if (editGenderStart !== -1 && editGenderEnd !== -1) {
    // Only remove if it contains Cinsiyet
    const slice = content.substring(editGenderStart, editGenderEnd);
    if (slice.includes('Cinsiyet')) {
        content = content.substring(0, editGenderStart) + content.substring(editGenderEnd);
    }
}

// Remove references to gender in state
content = content.replace(/const \[gender, setGender\] = useState<UserGender>\(.*?;\n/, '');
content = content.replace(/gender,\n/, '');
content = content.replace(/setGender\(.*?\);\n/g, '');
content = content.replace(/import \{ UserGender \} from '\.\.\/types\/user';\n/, '');
content = content.replace(/const genderLabels: Record<UserGender, string> = \{[\s\S]*?\};\n/, '');

fs.writeFileSync('src/pages/ProfilePage.tsx', content, 'utf8');
