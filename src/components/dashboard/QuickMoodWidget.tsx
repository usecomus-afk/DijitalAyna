import React, { useState, useEffect, useRef } from 'react';
import { Smile, CheckCircle, Plus } from 'lucide-react';
import { db } from '../../db';
import { getAvatarMap } from '../../constants/avatars';

const AVAILABLE_TAGS = ['İş', 'Uyku', 'Zihinsel Yük', 'Sosyal', 'Açık Hava', 'Yorgunluk'];

interface QuickMoodWidgetProps {
  fillHeight?: boolean;
}

export const QuickMoodWidget: React.FC<QuickMoodWidgetProps> = ({ fillHeight = false }) => {
  const avatarMap = getAvatarMap();

  const moodOptions = [
    { id: 'harika', score: 5, avatarSrc: avatarMap.harika, label: 'Harika', bgColor: 'bg-purple-50', hoverBg: 'hover:bg-purple-100' },
    { id: 'enerjik', score: 5, avatarSrc: avatarMap.enerjik, label: 'Enerjik', bgColor: 'bg-indigo-50', hoverBg: 'hover:bg-indigo-100' },
    { id: 'iyi', score: 4, avatarSrc: avatarMap.iyi, label: 'İyi', bgColor: 'bg-emerald-50', hoverBg: 'hover:bg-emerald-100' },
    { id: 'mutlu', score: 4, avatarSrc: avatarMap.mutlu, label: 'Mutlu', bgColor: 'bg-teal-50', hoverBg: 'hover:bg-teal-100' },
    { id: 'normal', score: 3, avatarSrc: avatarMap.normal, label: 'Normal', bgColor: 'bg-[#EEF2FA]', hoverBg: 'hover:bg-[#E2E8F4]' },
    { id: 'dusuk', score: 2, avatarSrc: avatarMap.dusuk, label: 'Düşük', bgColor: 'bg-[#FEF5E7]', hoverBg: 'hover:bg-[#FDEED2]' },
    { id: 'uzgun', score: 2, avatarSrc: avatarMap.uzgun, label: 'Üzgün', bgColor: 'bg-orange-50', hoverBg: 'hover:bg-orange-100' },
    { id: 'kaygili', score: 2, avatarSrc: avatarMap.kaygili, label: 'Kaygılı', bgColor: 'bg-yellow-50', hoverBg: 'hover:bg-yellow-100' },
    { id: 'zorlu', score: 1, avatarSrc: avatarMap.zorlu, label: 'Zorlu', bgColor: 'bg-rose-50', hoverBg: 'hover:bg-rose-100' },
    { id: 'mutsuz', score: 1, avatarSrc: avatarMap.mutsuz, label: 'Mutsuz', bgColor: 'bg-red-50', hoverBg: 'hover:bg-red-100' },
    { id: 'ofkeli', score: 1, avatarSrc: avatarMap.ofkeli, label: 'Öfkeli', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-200' },
    { id: 'umutsuz', score: 1, avatarSrc: avatarMap.umutsuz, label: 'Umutsuz', bgColor: 'bg-zinc-100', hoverBg: 'hover:bg-zinc-200' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 200;
    }
  }, []);

  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleTag = async (tag: string) => {
    setSavedSuccess(false);
    const updatedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(updatedTags);

    if (lastSavedId) {
      try {
        await db.moodReports.update(lastSavedId, { tags: updatedTags });
      } catch (err) {
        console.warn('[QuickMoodWidget] Failed to update tags on active mood report:', err);
      }
    }
  };

  const handleSelectMood = (id: string) => {
    setSelectedMoodId(id);
    setSavedSuccess(false);
  };

  const handleExplicitSave = async () => {
    if (!selectedMoodId || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    const todayStr = new Date().toISOString().split('T')[0];
    const selectedMood = moodOptions.find((m) => m.id === selectedMoodId);
    if (!selectedMood) return;

    const combinedTags = Array.from(new Set([...selectedTags, selectedMood.label]));

    try {
      if (lastSavedId) {
        await db.moodReports.update(lastSavedId, {
          score: selectedMood.score,
          energyScore: selectedMood.score,
          tags: combinedTags,
          timestamp: Date.now(),
        });
      } else {
        const id = await db.moodReports.add({
          timestamp: Date.now(),
          date: todayStr,
          score: selectedMood.score,
          energyScore: selectedMood.score,
          tags: combinedTags,
        });
        setLastSavedId(id as number);
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSelectedMoodId(null);
        setSelectedTags([]);
        setLastSavedId(null);
        setSavedSuccess(false);
      }, 2500);

      void (async () => {
        try {
          const store = (await import('../../store/useAppStore')).useAppStore.getState();
          await store.runAnalysisPipeline();
          if (store.settings.cloudBackupEnabled) {
            await store.syncCloudDataNow();
          }
        } catch (bgErr) {
          console.warn('[QuickMoodWidget] Background analysis/sync failed:', bgErr);
        }
      })();
    } catch (err) {
      console.error('[QuickMoodWidget] Explicit save error:', err);
      setSaveError('Kayıt kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-comus-sand-light/20 ${
        fillHeight ? 'flex-1 min-h-0 flex flex-col justify-between' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-comus-navy text-base sm:text-lg leading-tight">
              Kendini nasıl hissediyorsun?
            </h4>
            <span className="text-xs text-comus-sand-dark">
              Şu anki hissiyatını seç ve kaydet
            </span>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-fadeIn shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> Kaydedildi
          </span>
        )}
      </div>

      {/* Mood Cards Carousel — Proportionally fills center space */}
      <div
        ref={scrollRef}
        className={`flex overflow-x-auto gap-3 items-center snap-x hide-scrollbar ${
          fillHeight ? 'flex-1 min-h-0 my-3 py-2' : 'my-4 pb-3'
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        {moodOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelectMood(opt.id)}
            title={opt.label}
            className={`flex-shrink-0 w-[104px] sm:w-[114px] flex flex-col items-center justify-center ${
              fillHeight ? 'h-full max-h-48 min-h-[136px]' : 'h-32'
            } p-3 rounded-2xl border transition-all duration-200 group snap-center ${
              selectedMoodId === opt.id
                ? `${opt.bgColor} text-comus-navy font-bold border-comus-copper shadow-md scale-105 ring-1 ring-comus-copper`
                : `${opt.bgColor} ${opt.hoverBg} border-transparent text-comus-navy/80`
            }`}
          >
            <img
              src={opt.avatarSrc}
              alt={opt.label}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl mb-2 drop-shadow-sm group-hover:scale-110 transition-transform"
            />
            <span className="text-xs sm:text-sm font-semibold text-center leading-tight w-full">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tags Section */}
      <div className="pt-3 border-t border-comus-sand-light/20 space-y-2 shrink-0">
        <span className="text-xs font-medium text-comus-sand-dark block">
          Bu hisse eşlik eden bağlam etiketleri:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-comus-navy text-white font-medium shadow-sm'
                    : 'bg-comus-sand-subtle hover:bg-comus-sand-light/30 text-comus-sand-dark'
                }`}
              >
                {isSelected ? null : <Plus className="w-3.5 h-3.5 text-comus-sand" />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Action Footer */}
      <div className="mt-3 pt-3 border-t border-comus-sand-light/20 flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-comus-sand-dark truncate">
          {selectedMoodId
            ? `${moodOptions.find((m) => m.id === selectedMoodId)?.label} seçildi (${selectedTags.length} etiket)`
            : 'Modunuzu ve etiketleri seçin'}
        </span>
        <button
          onClick={handleExplicitSave}
          disabled={!selectedMoodId || isSaving}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            savedSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-comus-navy hover:bg-comus-navy-light text-white'
          }`}
        >
          <CheckCircle className={`w-4 h-4 ${savedSuccess ? 'text-white' : 'text-emerald-400'}`} />
          <span>{savedSuccess ? 'Kayıtlara işlendi' : isSaving ? 'Kaydediliyor...' : 'Kayıtlara işle'}</span>
        </button>
      </div>
      {saveError && (
        <p role="alert" className="mt-2 text-[11px] font-medium text-rose-600 shrink-0">
          {saveError}
        </p>
      )}
    </div>
  );
};
