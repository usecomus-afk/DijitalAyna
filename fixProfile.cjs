const fs = require('fs');
let c = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

c = c.replace(/Cihaz i.i .Yifreli profil/g, 'Cihaz içi şifreli profil');
c = c.replace(/Cihaz .i Baz Hatt. Durumu/g, 'Cihaz İçi Baz Hattı Durumu');
c = c.replace(/Yaln.zca bu cihazdan toplanan ger.ek biyobelirte. telemetrisi/g, 'Yalnızca bu cihazdan toplanan gerçek biyobelirteç telemetrisi');
c = c.replace(/Kay.tl. G.n/g, 'Kayıtlı Gün');
c = c.replace(/\{distinctDays\} G.n/g, '{distinctDays} Gün');
c = c.replace(/Ruh Hali Yoklamas./g, 'Ruh Hali Yoklaması');
c = c.replace(/\{reportsCount\} Kay.t/g, '{reportsCount} Kayıt');
c = c.replace(/%100 Cihazda .\?ifreli/g, '%100 Cihazda Şifreli');
c = c.replace(/%100 Cihazda .ifreli/g, '%100 Cihazda Şifreli');
c = c.replace(/Bulut Yedekleme Kapal./g, 'Bulut Yedekleme Kapalı');
c = c.replace(/hesab.n.zla g.venle/g, 'hesabınızla güvenle');
c = c.replace(/Yaln.zca bu telefonda/g, 'Yalnızca bu telefonda');
c = c.replace(/saklan.r/g, 'saklanır');
c = c.replace(/ayarlar sayfas.ndan a.abilirsiniz/g, 'Ayarlar sayfasından açabilirsiniz');
c = c.replace(/sayfas.ndan a.abilirsiniz/g, 'sayfasından açabilirsiniz');
c = c.replace(/Do.rudan Google/g, 'Doğrudan Google');
c = c.replace(/.\?imdi Yedekle/g, 'Şimdi Yedekle');
c = c.replace(/.imdi Yedekle/g, 'Şimdi Yedekle');
c = c.replace(/9 g.nl.k verilerinizi/g, '9 günlük verilerinizi');
c = c.replace(/dosyas. olarak/g, 'dosyası olarak');
c = c.replace(/Yede.i .ndir/g, 'Yedeği İndir');
c = c.replace(/Geri Y.kle/g, 'Geri Yükle');
c = c.replace(/Biyobelirte. de.i.imlerini/g, 'Biyobelirteç değişimlerini');
c = c.replace(/ila. etkile.imlerini/g, 'ilaç etkileşimlerini');
c = c.replace(/payla.n/g, 'paylaşın');
c = c.replace(/Cihaz Sens.r & Bildirim Ayarlar./g, 'Cihaz Sensör & Bildirim Ayarları');
c = c.replace(/.vme.l.er, yaz.m ritmi, bildirimler ve veri s.f.rlama/g, 'İvmeölçer, yazım ritmi, bildirimler ve veri sıfırlama');

// Wait, the regex `.` matches `\uFFFD`. Let's test it:
fs.writeFileSync('src/pages/ProfilePage.tsx', c, 'utf8');
