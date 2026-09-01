import React, { useState } from 'react';
import {
  Users,
  Shield,
  GraduationCap,
  Wallet,
  FlaskConical,
  Sparkles,
  Heart,
  CheckCircle2,
  Lock,
  Bell,
  Gift,
  Trees,
  Award,
  EyeOff,
  Eye,
  Check
} from 'lucide-react';
import { Disclaimer } from '../components/common/Disclaimer';

export const EcosystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parent' | 'school' | 'wallet' | 'science'>('parent');

  // Wallet & STK State (Slide 15)
  const [walletBalance, setWalletBalance] = useState(480);
  const [donatedTotal, setDonatedTotal] = useState(150);
  const [donationToast, setDonationToast] = useState<string | null>(null);

  // Research Opt-in State (Slide 16)
  const [researchStudies, setResearchStudies] = useState([
    { id: '1', name: 'Majör Depresyon ve Psikomotor Yazım Dinamikleri Araştırması', partner: 'Hacettepe Tıp & ComusAI Lab', optedIn: true, participants: '14.280' },
    { id: '2', name: 'Nöroçeşitlilik (DEHB & Odak Ritmi) Dijital Fenotipleme Çalışması', partner: 'Boğaziçi Nörobilim Enstitüsü', optedIn: true, participants: '8.940' },
    { id: '3', name: 'Sirkadiyen Ekran Işığı ve Uyku İklimi Analizi', partner: 'TÜBİTAK Bilimsel Araştırma Grubu', optedIn: false, participants: '22.150' },
  ]);

  // School Counselor Panel State (Slide 14)
  const [selectedClass, setSelectedClass] = useState('10-C');
  const [seminarPlanned, setSeminarPlanned] = useState(false);

  const handleDonate = (stkName: string, amount: number) => {
    if (walletBalance >= amount) {
      setWalletBalance((prev) => prev - amount);
      setDonatedTotal((prev) => prev + amount);
      setDonationToast(`₺${amount} TL başarıyla ${stkName} hesabına bağışlandı. Doğaya ve topluma katkınız için teşekkürler!`);
      setTimeout(() => setDonationToast(null), 4000);
    }
  };

  const toggleStudyOptIn = (studyId: string) => {
    setResearchStudies((prev) =>
      prev.map((s) => (s.id === studyId ? { ...s, optedIn: !s.optedIn } : s))
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="font-serif font-bold text-2xl text-comus-navy">
              ComusAI Ekosistemi: Çok Paydaşlı Değer Ağı
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-comus-sand-dark mt-1">
            Bireyden topluma, okuldan bilime uzanan proaktif zihinsel sağlık ve veri demokrasisi kalkanı
          </p>
        </div>
      </div>

      {/* 4 Ecosystem Tabs (Slides 11-17) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-comus-surface p-1.5 rounded-2xl border border-comus-sand-light/40 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('parent')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'parent'
              ? 'bg-comus-navy text-white shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Ebeveyn Kalkanı</span>
        </button>

        <button
          onClick={() => setActiveTab('school')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'school'
              ? 'bg-comus-navy text-white shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-400" />
          <span>Rehber Öğretmen</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'wallet'
              ? 'bg-comus-navy text-white shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <Wallet className="w-4 h-4 text-teal-300" />
          <span>Cüzdan & STK Bağış</span>
        </button>

        <button
          onClick={() => setActiveTab('science')}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'science'
              ? 'bg-comus-navy text-white shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-sky-400" />
          <span>Vatandaş Bilimci</span>
        </button>
      </div>

      {/* TAB 1: Ebeveyn Kalkanı (Slide 12) */}
      {activeTab === 'parent' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Concept Overview */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-comus-navy">
                    Ebeveynler İçin: Koruyucu Kalkan & Erken Uyarı (PDF Sayfa 12)
                  </h3>
                  <p className="text-xs text-comus-sand-dark">
                    Çocukları dijital dünyanın risklerinden gizliliklerini ihlal etmeden koruma
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Aktif Kalkan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                <div className="text-xs font-bold text-rose-900 uppercase tracking-wider">Problem</div>
                <p className="text-xs text-rose-950 leading-relaxed">
                  Siber zorbalık, sosyal izolasyon ve ani uyku bozuklukları gibi riskli örüntüleri ebeveynler güven ilişkisini zedelemeden nasıl fark edebilir?
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">ComusAI Çözümü</div>
                <p className="text-xs text-emerald-950 leading-relaxed">
                  Çocuğun özel mesajlarını okumadan, sadece davranışsal değişiklikleri analiz ederek "risk öncesi" sakin rehberlik ve erken uyarı sunar.
                </p>
              </div>
            </div>

            {/* Mock Parent Notification Card from Slide 12 */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-comus-surface to-teal-50/60 border border-teal-200/80 shadow-soft space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-700 animate-bounce" />
                <span className="text-xs font-bold text-teal-900">
                  ComusAI Ebeveyn Kalkanı Canlı Bildirim Örneği
                </span>
                <span className="text-[10px] bg-teal-200/60 text-teal-900 px-2 py-0.2 rounded font-semibold ml-auto">
                  72 Saatlik Fenotip Sapması
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-teal-100 shadow-sm text-xs text-comus-navy leading-relaxed font-normal space-y-2">
                <p>
                  "Çocuğunuzun son <strong>72 saatlik</strong> dijital etkileşimlerinde alışılmışın dışında bir <strong>'sosyal çekilme'</strong> ve <strong>gece uykusuzluğu</strong> tespit edildi. Bu durum yoğun sınav stresi veya akran/siber zorbalık belirtisi olabilir."
                </p>
                <p className="font-semibold text-teal-900 italic">
                  "Bugün onunla sorgulayıcı olmadan, sakin bir sohbet etmeye ne dersiniz?"
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-comus-sand-dark flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>İçerik Gizliliği Esastır:</strong> Mesaj içeriği okunmaz, çocuk-ebeveyn güveni korunur.
                </span>
                <button className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors">
                  Sohbet Rehberini Aç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Rehber Öğretmen & Okul Paneli (Slide 14) */}
      {activeTab === 'school' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-comus-sand-light/30 shadow-soft space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-comus-navy">
                    Eğitim Kurumları İçin: Okulun "Topluluk Ruh Sağlığı Haritası" (PDF Sayfa 14)
                  </h3>
                  <p className="text-xs text-comus-sand-dark">
                    Rehber öğretmenlerin bireysel gizliliği ihlal etmeden okulun psikolojik nabzını izlemesi
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Rehber Öğretmen Paneli
              </span>
            </div>

            {/* Class Stress Level Bar Chart (Replicating Slide 14) */}
            <div className="p-5 rounded-2xl bg-comus-surface border border-comus-sand-light/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-comus-navy">
                    Sınıf Stres Seviyeleri ve Dağılımı
                  </div>
                  <div className="text-[11px] text-comus-sand-dark">
                    Ölçülen: Hareketlilik, yazım temposu ve ekran yorgunluğu ortalamaları
                  </div>
                </div>

                <div className="text-xs px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold">
                  Bugün 10-C'de Stres %40 Arttı
                </div>
              </div>

              {/* Class Bar Chart */}
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-40 pt-4 px-2 border-b border-comus-sand-light/30">
                {[
                  { name: '10-A', stress: 35, color: 'bg-emerald-500' },
                  { name: '10-B', stress: 28, color: 'bg-emerald-400' },
                  { name: '10-C', stress: 84, color: 'bg-rose-500' }, // Alerted class
                  { name: '10-D', stress: 62, color: 'bg-amber-500' },
                  { name: '10-E', stress: 30, color: 'bg-emerald-500' },
                  { name: '10-F', stress: 70, color: 'bg-amber-500' },
                ].map((c) => (
                  <div
                    key={c.name}
                    onClick={() => setSelectedClass(c.name)}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-comus-navy group-hover:scale-110 transition-transform">
                      %{c.stress}
                    </span>
                    <div className="w-full bg-slate-100 rounded-t-xl h-28 flex items-end">
                      <div
                        className={`w-full ${c.color} rounded-t-xl transition-all duration-500 ${
                          selectedClass === c.name ? 'ring-2 ring-comus-navy' : ''
                        }`}
                        style={{ height: `${c.stress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-comus-sand-dark">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Görülen Veri vs Görülmeyen Veri Matrix (From Slide 14) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Görülen Veri (Rehberlik Ekranı):</span>
                  </div>
                  <p className="text-comus-navy">
                    "{selectedClass} sınıfında ortalama sınav kaygısı ve stres seviyesi bugün %40 yükseldi."
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-comus-sand-light/40 text-xs space-y-1 opacity-75">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-rose-600" />
                    <span>Görülmeyen Veri (Kesinlikle Gizli):</span>
                  </div>
                  <p className="text-comus-sand-dark italic">
                    "*Ali stresli.*" veya "*Ayşe uyuyamadı.*" gibi bireysel etiketler asla paylaşılmaz.
                  </p>
                </div>
              </div>

              {/* Counselor Action Intervention */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-amber-950">Önerilen Proaktif Müdahale:</div>
                  <div className="text-amber-900 mt-0.5">
                    10-C sınıfına yönelik "Matematik Sınavı Öncesi Kaygı Yönetimi & Nefes Semineri" planlayın.
                  </div>
                </div>

                {seminarPlanned ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Seminer Takvime Eklendi</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setSeminarPlanned(true)}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold transition-colors shrink-0"
                  >
                    Genel Seminer Planla
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Comus Cüzdanı, Veri Demokrasisi & STK Bağışı (Slide 15) */}
      {activeTab === 'wallet' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Toast */}
          {donationToast && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{donationToast}</span>
            </div>
          )}

          {/* Wallet Header & Balance */}
          <div className="bg-gradient-to-br from-comus-navy to-comus-navy-dark text-white rounded-3xl p-6 sm:p-7 shadow-soft-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-teal-300 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                    Veri Demokrasisi & Sosyal Etki (PDF Sayfa 15)
                  </span>
                  <h3 className="font-serif font-bold text-xl text-white">
                    Comus Cüzdanı
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-white/70">Biriken Veri Değeri Bakiyesi</div>
                <div className="text-3xl font-mono font-bold text-teal-300 mt-0.5">
                  ₺{walletBalance} <span className="text-sm font-sans font-normal text-white/80">TL</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed border-t border-white/10 pt-3">
              "Bu modelde kullanıcı, verisinin kontrolüne ve değerine sahip olan tek güçtür. Anonim veri paylaşım izniniz oranında kazanç elde eder, bunu banka hesabınıza çekebilir veya anlaşmalı STK'lara bağışlayabilirsiniz."
            </p>
          </div>

          {/* Partner Perks (Marka İş Birlikleri - Spotify, Netflix, Starbucks, Trendyol, Udemy) */}
          <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-base text-comus-navy flex items-center gap-2">
                  <Gift className="w-4 h-4 text-comus-copper" />
                  <span>Marka İş Birlikleri & Ayrıcalıklar (PDF Sayfa 15)</span>
                </h4>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Esenlik ritminizi korudukça ve veri demokrasisine katıldıkça açılan kuponlar
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { brand: 'Spotify', perk: '3 Ay Premium %50 İndirim', category: 'Müzik & Ruh Hali' },
                { brand: 'Starbucks', perk: '1 Adet Sükunet Çayı / Kahve', category: 'Mola İkramı' },
                { brand: 'Trendyol', perk: '₺150 Sağlıklı Yaşam Kuponu', category: 'E-Ticaret' },
                { brand: 'Udemy', perk: 'Zihinsel Farkındalık Eğitimi', category: 'Kişisel Gelişim' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 hover:border-comus-copper/40 transition-colors space-y-1.5 text-xs"
                >
                  <div className="font-bold text-comus-navy">{item.brand}</div>
                  <div className="text-comus-copper font-semibold leading-tight">{item.perk}</div>
                  <div className="text-[10px] text-comus-sand-dark">{item.category}</div>
                </div>
              ))}
            </div>
          </div>

          {/* STK Donation Section (TEMA, LÖSEV, Sokak Hayvanları) */}
          <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-base text-comus-navy flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <span>Toplum İçin Sosyal Sorumluluk: Tek Tıkla STK Bağışı</span>
                </h4>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Anlaşmalı sivil toplum kuruluşlarına bağışlayarak her gün küçük bir iyilik yapın
                </p>
              </div>

              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Toplam Bağışınız: ₺{donatedTotal} TL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* TEMA */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5 flex flex-col justify-between text-xs">
                <div>
                  <div className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                    <Trees className="w-4 h-4 text-emerald-700" />
                    <span>TEMA Vakfı</span>
                  </div>
                  <p className="text-emerald-900 mt-1 text-[11px] leading-relaxed">
                    Türkiye genelinde fidan dikimi ve çölleşmeyle mücadeleye destek olun.
                  </p>
                </div>
                <button
                  onClick={() => handleDonate('TEMA Vakfı', 50)}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold transition-colors"
                >
                  ₺50 Bağışla (1 Fidan)
                </button>
              </div>

              {/* LÖSEV */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2.5 flex flex-col justify-between text-xs">
                <div>
                  <div className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-600" />
                    <span>LÖSEV</span>
                  </div>
                  <p className="text-rose-900 mt-1 text-[11px] leading-relaxed">
                    Lösemili çocukların sağlık, eğitim ve beslenme ihtiyaçlarına katkı sağlayın.
                  </p>
                </div>
                <button
                  onClick={() => handleDonate('LÖSEV', 50)}
                  className="w-full py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-semibold transition-colors"
                >
                  ₺50 Bağışla (Destek)
                </button>
              </div>

              {/* Hayvan Hakları */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5 flex flex-col justify-between text-xs">
                <div>
                  <div className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span>Sokak Hayvanları Kumbarası</span>
                  </div>
                  <p className="text-amber-900 mt-1 text-[11px] leading-relaxed">
                    Barınaklardaki ve sokaktaki can dostlarımıza mama ve veteriner bakımı.
                  </p>
                </div>
                <button
                  onClick={() => handleDonate('Sokak Hayvanları Kumbarası', 30)}
                  className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold transition-colors"
                >
                  ₺30 Bağışla (Mama Paketi)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Vatandaş Bilimci & Bilim Dünyası (Slide 16 & 17) */}
      {activeTab === 'science' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-comus-sand-light/30 shadow-soft space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-comus-navy">
                    Daha Büyük Bir Amaç: Bilimsel Keşifleri Hızlandırmak (PDF Sayfa 16)
                  </h3>
                  <p className="text-xs text-comus-sand-dark">
                    ComusAI ile her kullanıcı bir "vatandaş bilimci" olabilir
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                Gerçek Dünya Kanıtı (RWE)
              </span>
            </div>

            {/* 3 Steps from Slide 16 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1">
                <div className="font-bold text-comus-navy">1. Gönüllü Katılım (Opt-in)</div>
                <p className="text-comus-sand-dark leading-relaxed">
                  Kullanıcı, hangi araştırmalara (depresyon, sirkadiyen, nöroçeşitlilik) destek olmak istediğini özgürce seçer.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1">
                <div className="font-bold text-comus-navy">2. Tam Anonimleştirme</div>
                <p className="text-comus-sand-dark leading-relaxed">
                  Veriler kimlikten tamamen ayrıştırılır (Örn: <em>User-8492, 25-30 yaş, X davranış örüntüsü</em>).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1">
                <div className="font-bold text-comus-navy">3. Gerçek Dünya Kanıtı (RWE)</div>
                <p className="text-comus-sand-dark leading-relaxed">
                  Araştırmacılar, anketler yerine nesnel ve anlık dijital biyobelirteçlere ulaşarak tedavileri geliştirir.
                </p>
              </div>
            </div>

            {/* Active Studies List with Toggle Switch */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-comus-navy">
                Aktif Üniversite & Bilimsel Araştırma Projeleri:
              </div>

              {researchStudies.map((study) => (
                <div
                  key={study.id}
                  className="p-4 rounded-2xl bg-comus-surface border border-comus-sand-light/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-comus-navy">{study.name}</div>
                    <div className="text-[11px] text-comus-sand-dark flex items-center gap-2">
                      <span>Proje Ortağı: {study.partner}</span>
                      <span>•</span>
                      <span>{study.participants} Gönüllü Katkıcı</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStudyOptIn(study.id)}
                    className={`px-4 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                      study.optedIn
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-comus-sand-light/50 text-comus-sand-dark hover:text-comus-navy'
                    }`}
                  >
                    {study.optedIn ? 'Katılım Aktif ✓' : 'Gönüllü Ol'}
                  </button>
                </div>
              ))}
            </div>

            {/* Collective Progress Callout from Slide 16 */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-900 to-comus-navy text-white text-xs leading-relaxed space-y-1.5">
              <div className="font-bold text-sky-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kolektif İlerleme Gücü (PDF Sayfa 16)</span>
              </div>
              <p className="text-white/90">
                "Paylaştığınız anonim bir uyku verisi, ileride bir başka kullanıcının tükenmişlik sendromunu 1 ay önceden fark etmesini sağlayan yapay zeka algoritmasını eğitir. Birlikte daha korunaklı bir zihinsel sağlık geleceği inşa ediyoruz."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
};
