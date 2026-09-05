import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';
import { UserGender } from '../types/user';
import {
  User,
  Mail,
  Calendar,
  Edit2,
  ShieldCheck,
  Activity,
  FileText,
  LogOut,
  Check,
  ChevronRight,
  Sliders,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, baselineDayCount, setUserProfile, disconnectGoogleProfile } = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [age, setAge] = useState<number>(userProfile.age || 28);
  const [gender, setGender] = useState<UserGender>(userProfile.gender || 'prefer_not_to_say');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Real device metrics and reports
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const reportsCount = useLiveQuery(() => db.moodReports.count()) || 0;

  // Single source of truth for baseline day count matching DigitalTwinMirror
  const distinctDays = useMemo(() => {
    const dates = new Set(dailyMetrics.map((m) => m.date));
    return Math.max(dates.size, baselineDayCount, 1);
  }, [dailyMetrics, baselineDayCount]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setUserProfile({
      name: name.trim() || 'Kullanıcı',
      age,
      gender,
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = async () => {
    if (userProfile.isGoogleConnected) {
      await disconnectGoogleProfile();
    } else {
      await setUserProfile({
        name: 'Kullanıcı',
        username: undefined,
        email: undefined,
        picture: undefined,
        isGoogleConnected: false,
        isAppleConnected: false,
        isPasswordAccount: false,
      });
    }
  };

  const genderLabels: Record<UserGender, string> = {
    female: 'Kadın',
    male: 'Erkek',
    other: 'Diğer',
    prefer_not_to_say: 'Belirtilmedi',
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {userProfile.picture ? (
            <img
              src={userProfile.picture}
              alt={userProfile.name}
              className="w-20 h-20 rounded-3xl object-cover border-2 border-comus-copper/20 shadow-soft"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper text-2xl font-bold font-serif shadow-soft">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="font-serif font-bold text-2xl text-comus-navy">
                {userProfile.name}
              </h1>
              {userProfile.isGoogleConnected && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Google Hesabı
                </span>
              )}
              {userProfile.isAppleConnected && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-900 border border-stone-300">
                  Apple Hesabı
                </span>
              )}
              {!userProfile.isGoogleConnected && !userProfile.isAppleConnected && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Yerel Cihaz Profili
                </span>
              )}
            </div>

            <p className="text-xs text-comus-sand-dark flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{userProfile.email || 'Cihaz içi şifreli profil'}</span>
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-comus-sand-dark">
              <span>Yaş: <strong className="text-comus-navy">{userProfile.age || 'Belirtilmedi'}</strong></span>
              <span>•</span>
              <span>Cinsiyet: <strong className="text-comus-navy">{userProfile.gender ? genderLabels[userProfile.gender] : 'Belirtilmedi'}</strong></span>
            </div>
          </div>

          <button
            onClick={() => {
              setName(userProfile.name);
              setAge(userProfile.age || 28);
              setGender(userProfile.gender || 'prefer_not_to_say');
              setIsEditing(!isEditing);
            }}
            className="p-2.5 text-comus-sand-dark hover:text-comus-navy rounded-2xl hover:bg-comus-surface transition-colors cursor-pointer border border-comus-sand-light/30"
            title="Profili Düzenle"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profil bilgileriniz başarıyla güncellendi.</span>
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-5 pt-5 border-t border-comus-sand-light/20 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-comus-navy block">Ad Soyad:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 pl-8 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
                  />
                  <User className="w-3.5 h-3.5 text-comus-sand absolute left-2.5 top-3" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-comus-navy block">Yaş:</label>
                <div className="relative">
                  <input
                    type="number"
                    min="16"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 pl-8 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
                  />
                  <Calendar className="w-3.5 h-3.5 text-comus-sand absolute left-2.5 top-3" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-comus-navy block">Cinsiyet:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'female', label: 'Kadın' },
                  { id: 'male', label: 'Erkek' },
                  { id: 'other', label: 'Diğer' },
                  { id: 'prefer_not_to_say', label: 'Belirtmek İstemiyorum' },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGender(g.id as UserGender)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition-all text-center cursor-pointer ${
                      gender === g.id
                        ? 'bg-comus-navy text-white border-comus-navy'
                        : 'bg-comus-surface text-comus-sand-dark border-comus-sand-light/40'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-comus-sand-dark hover:bg-comus-surface transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Real Baseline Calibration Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-comus-navy">
                Cihaz İçi Baz Hattı Durumu
              </h2>
              <p className="text-xs text-comus-sand-dark">
                Yalnızca bu cihazdan toplanan gerçek biyobelirteç telemetrisi
              </p>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
            distinctDays >= 7
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {distinctDays >= 7 ? 'Baz Hattı Aktif' : `Kalibrasyon (${distinctDays}/7 Gün)`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20">
            <span className="text-[11px] text-comus-sand-dark block">Kayıtlı Gün</span>
            <strong className="text-lg font-bold font-serif text-comus-navy">{distinctDays} Gün</strong>
          </div>
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20">
            <span className="text-[11px] text-comus-sand-dark block">Ruh Hali Yoklaması</span>
            <strong className="text-lg font-bold font-serif text-comus-navy">{reportsCount} Kayıt</strong>
          </div>
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-comus-sand-dark block">Yerel Depolama</span>
            <strong className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>%100 Cihazda Şifreli</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-2.5">
        <button
          onClick={() => navigate('/doctor')}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-stone-50 rounded-2xl border border-comus-sand-light/30 shadow-soft transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-comus-navy">
                Klinik & Uzman Doktor Raporu
              </div>
              <div className="text-[11px] text-comus-sand-dark">
                Biyobelirteç değişimlerini ve ilaç etkileşimlerini hekiminizle paylaşın
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-comus-sand-dark" />
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-stone-50 rounded-2xl border border-comus-sand-light/30 shadow-soft transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-comus-navy">
                Cihaz Sensör & Bildirim Ayarları
              </div>
              <div className="text-[11px] text-comus-sand-dark">
                İvmeölçer, yazım ritmi, bildirimler ve veri sıfırlama
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-comus-sand-dark" />
        </button>
      </div>

      {/* Logout Button */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Oturumu Kapat</span>
        </button>
      </div>
    </div>
  );
};
