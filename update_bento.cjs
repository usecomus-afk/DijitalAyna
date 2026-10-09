const fs = require('fs');
let c = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

c = c.replace(/const \[age, setAge\] = useState<number>\(userProfile\.age \|\| 28\);/, "const [age, setAge] = useState<number>(userProfile.age || 28);\n  const [gender, setGender] = useState<string>(userProfile.gender || 'Belirtilmedi');");

c = c.replace(/setAge\(userProfile\.age \|\| 28\);/g, "setAge(userProfile.age || 28);\n              setGender(userProfile.gender || 'Belirtilmedi');");

const genderInputHtml = `
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-comus-navy block">Cinsiyet:</label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full text-xs p-2.5 pl-8 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy appearance-none"
                    >
                      <option value="Belirtilmedi">Belirtilmedi</option>
                      <option value="Erkek">Erkek</option>
                      <option value="Kadın">Kadın</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                    <User className="w-3.5 h-3.5 text-comus-sand absolute left-2.5 top-3" />
                  </div>
                </div>`;

c = c.replace(/<div className="space-y-1">\s*<label className="text-xs font-semibold text-comus-navy block">Ya[^\<]*:<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, (match) => match + '\n' + genderInputHtml);

c = c.replace(/await setUserProfile\(\{ name, age, picture: customPicture \}\);/, "await setUserProfile({ name, age, gender: gender === 'Belirtilmedi' ? undefined : gender as any, picture: customPicture });");

fs.writeFileSync('src/pages/ProfilePage.tsx', c, 'utf8');
