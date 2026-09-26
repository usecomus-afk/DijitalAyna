import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. "Dijital Mental İkizim" -> "Dijital Mental İkizim"
    content = content.replace("Dijital Mental İkizim", "Dijital Mental İkizim")
    # 2. "DijitalMentalIkizim" -> "DijitalMentalIkizim"
    content = content.replace("DijitalMentalIkizim", "DijitalMentalIkizim")
    
    # 3. "Dijital Mental İkizim" -> "Dijital Mental İkizim"
    content = content.replace("Dijital Mental İkizim", "Dijital Mental İkizim")
    # 4. "DijitalMentalIkizim" -> "DijitalMentalIkizim" (Just in case)
    content = content.replace("DijitalMentalIkizim", "DijitalMentalIkizim")
    
    # 5. "Dijital Mental İkizim" -> "Dijital Mental İkizim"
    content = content.replace("Dijital Mental İkizim", "Dijital Mental İkizim")
    
    # 6. URL schemes / lowecase "dijitalayna" -> "dijitalmentalikizim"
    # But ONLY in specific strings like:
    content = content.replace("dijitalmentalikizim://", "dijitalmentalikizim://")
    content = content.replace("com.dijitalmentalikizim.app", "com.dijitalmentalikizim.app")
    content = content.replace('name="dijital-mental-ikizim"', 'name="dijital-mental-ikizim"')
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    skip_dirs = {'.git', 'node_modules', '.firebase', 'dist', 'Payload', 'ios_artifact', 'ios_artifact_latest', 'ios_artifact_v3', 'ios_artifact_v4', 'ios_artifact_v5', 'ios_artifact_v6', 'ios_artifact_v7', 'ios_artifact_v8', 'ios_artifact_v9'}
    skip_exts = {'.png', '.jpg', '.jpeg', '.svg', '.zip', '.ipa', '.pdf', '.woff', '.woff2', '.ttf', '.eot'}

    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in skip_exts:
                continue
            
            filepath = os.path.join(root, file)
            try:
                replace_in_file(filepath)
            except Exception as e:
                pass

if __name__ == '__main__':
    main()
