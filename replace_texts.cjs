const fs = require('fs');
const path = require('path');

const skipDirs = new Set(['.git', 'node_modules', '.firebase', 'dist', 'Payload', 'ios_artifact', 'ios_artifact_latest', 'ios_artifact_v3', 'ios_artifact_v4', 'ios_artifact_v5', 'ios_artifact_v6', 'ios_artifact_v7', 'ios_artifact_v8', 'ios_artifact_v9']);
const skipExts = new Set(['.png', '.jpg', '.jpeg', '.svg', '.zip', '.ipa', '.pdf', '.woff', '.woff2', '.ttf', '.eot']);

function replaceInFile(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        const originalContent = content;
        
        // 1. "Dijital Mental İkizim" -> "Dijital Mental İkizim"
        content = content.replace(/Dijital Mental İkizim/g, "Dijital Mental İkizim");
        // 2. "DijitalMentalIkizim" -> "DijitalMentalIkizim"
        content = content.replace(/DijitalMentalIkizim/g, "DijitalMentalIkizim");
        
        // 3. "Dijital Mental İkizim" -> "Dijital Mental İkizim"
        content = content.replace(/Dijital Mental İkizim/g, "Dijital Mental İkizim");
        // 4. "DijitalMentalIkizim" -> "DijitalMentalIkizim"
        content = content.replace(/DijitalMentalIkizim/g, "DijitalMentalIkizim");
        
        // 5. "Dijital Mental İkizim" -> "Dijital Mental İkizim"
        content = content.replace(/Dijital Mental İkizim/g, "Dijital Mental İkizim");
        
        // 6. URL schemes / lowecase "dijitalayna"
        content = content.replace(/dijitalayna:\/\//g, "dijitalmentalikizim://");
        content = content.replace(/com\.dijitalayna\.app/g, "com.dijitalmentalikizim.app");
        content = content.replace(/name="dijital-mental-ikizim"/g, 'name="dijital-mental-ikizim"');
        
        if (content !== originalContent) {
            fs.writeFileSync(filepath, content, 'utf8');
            console.log(`Updated ${filepath}`);
        }
    } catch (e) {
        // Ignore read/write errors (e.g. binary files)
    }
}

function walkDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            if (!skipDirs.has(file)) {
                walkDir(filepath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (!skipExts.has(ext)) {
                replaceInFile(filepath);
            }
        }
    });
}

walkDir('.');
