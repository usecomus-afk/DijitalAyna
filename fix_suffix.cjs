const fs = require('fs');
const path = require('path');

function replaceInFile(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        const original = content;
        
        content = content.replace(/Dijital aynanızda/g, "Dijital Mental İkizinizde");
        content = content.replace(/dijital aynanızda/g, "dijital mental ikizinizde");
        content = content.replace(/Dijital Ayna'yı/g, "Dijital Mental İkizim'i");
        content = content.replace(/Dijital ayna/g, "Dijital Mental İkizim");
        content = content.replace(/dijital ayna/g, "dijital mental ikizim");
        
        if (content !== original) {
            fs.writeFileSync(filepath, content, 'utf8');
            console.log('Updated ' + filepath);
        }
    } catch (e) {}
}
function walkDir(dir) {
    const skipDirs = new Set(['.git', 'node_modules', '.firebase', 'dist', 'Payload', 'ios_artifact']);
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            if (!skipDirs.has(file)) walkDir(filepath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.swift') || file.endsWith('.plist')) {
            replaceInFile(filepath);
        }
    });
}
walkDir('.');
