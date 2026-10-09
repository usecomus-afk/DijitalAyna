const fs = require('fs');

let c = fs.readFileSync('ios/App/App/Info.plist', 'utf8');

c = c.replace(/<key>NSCameraUsageDescription<\/key>[\s\S]*?<string>[^<]*<\/string>/, 
  '<key>NSCameraUsageDescription</key>\n\t<string>Kamera yalnızca isteğe bağlı ölçümler ve fotoğraf çekimi için kullanılır; görüntüler kaydedilmez veya sunuculara gönderilmez.</string>');

c = c.replace(/<key>NSPhotoLibraryUsageDescription<\/key>[\s\S]*?<string>[^<]*<\/string>/, 
  '<key>NSPhotoLibraryUsageDescription</key>\n\t<string>Galeri etkileşim döngülerini analiz edebilmek ve günlüğünüze ekleyebilmeniz için fotoğraf erişimi gereklidir.</string>');

fs.writeFileSync('ios/App/App/Info.plist', c, 'utf8');
