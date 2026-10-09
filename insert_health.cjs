const fs = require('fs');

const content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
const lines = content.split('\n');

const healthBlock = `
      {/* 2. APPLE SAĞLIK (HEALTHKIT) ENTEGRASYONU */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
                Apple Sağlık (HealthKit)
              </h3>
              <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                Adım, uyku ve fiziksel aktivite verileriniz için iOS Sağlık uygulaması ile eşitleme
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-comus-sand-dark leading-relaxed">
          Dijital Mental İkizim'in Apple Sağlık veri kaynakları (Data Sources &amp; Access) listesinde görünebilmesi ve uyku/hareket analizleri yapabilmesi için aşağıdaki butona tıklayarak izin verin.
        </p>

        <button
          onClick={async () => {
            const res = await healthService.requestHealthPermissions();
            if (res.granted) {
              alert('Apple Sağlık izinleri başarıyla tanımlandı. Artık Ayarlar -> Sağlık -> Veri Erişimi ve Aygıtlar sekmesinde uygulamayı görebilirsiniz.');
            } else {
              alert(res.error || 'İzin reddedildi veya donanım desteklemiyor.');
            }
          }}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          Sağlık İzinlerini İste / Güncelle
        </button>
      </div>
`;

lines.splice(292, 0, healthBlock);

fs.writeFileSync('src/pages/SettingsPage.tsx', lines.join('\n'), 'utf8');
