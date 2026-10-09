import React, { useState, useEffect, useRef } from 'react';
import { Smile, CheckCircle, Plus } from 'lucide-react';
import { db } from '../../db';
import { getAvatarMap } from '../../constants/avatars';

const AVAILABLE_TAGS = ['İş', 'Uyku', 'Zihinsel Yük', 'Sosyal', 'Açık Hava', 'Yorgunluk'];

export const QuickMoodWidget: React.FC = () => {
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
  
  // To center 'normal' initially
  useEffect(() => {
    if (scrollRef.current) {
      // scroll to center roughly
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

    // If a report was already created in this interaction, seamlessly update its tags in Dexie
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
    const selectedMood = moodOptions.find(m => m.id === selectedMoodId);
    if (!selectedMood) return;

    // Combine manual tags with the selected exact mood label
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
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-comus-sand-light/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
            <Smile className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-comus-navy text-sm sm:text-base leading-tight">
              Kendini nasıl hissediyorsun?
            </h4>
            <span className="text-[11px] text-comus-sand-dark">
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

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-2.5 my-4 pb-3 snap-x hide-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {moodOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelectMood(opt.id)}
            title={opt.label}
            className={`flex-shrink-0 w-[88px] flex flex-col items-center justify-center h-28 p-2 rounded-2xl border transition-all duration-200 group snap-center ${
              selectedMoodId === opt.id
                ? `${opt.bgColor} text-comus-navy font-bold border-comus-copper shadow-md scale-105 ring-1 ring-comus-copper`
                : `${opt.bgColor} ${opt.hoverBg} border-transparent text-comus-navy/80`
            }`}
          >
            <img
              src={opt.avatarSrc}
              alt={opt.label}
              className="w-14 h-14 object-contain rounded-xl mb-1.5 drop-shadow-sm group-hover:scale-110 transition-transform"
            />
            <span className="text-[11px] font-semibold text-center leading-tight w-full">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-comus-sand-light/10">
        <span className="text-[11px] text-comus-sand-dark mr-1">Etiket ekle:</span>
        {AVAILABLE_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1 ${
                isSelected
                  ? 'bg-comus-navy text-white font-medium shadow-sm'
                  : 'bg-comus-sand-subtle hover:bg-comus-sand-light/30 text-comus-sand-dark'
              }`}
            >
              {isSelected ? null : <Plus className="w-3 h-3 text-comus-sand" />}
              <span>{tag}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-comus-sand-light/10 flex items-center justify-between gap-3">
        <span className="text-[11px] text-comus-sand-dark truncate">
          {selectedMoodId
            ? `${moodOptions.find((m) => m.id === selectedMoodId)?.label} seçildi (${selectedTags.length} etiket)`
            : 'Modunuzu ve etiketleri seçin'}
        </span>
        <button
          onClick={handleExplicitSave}
          disabled={!selectedMoodId || isSaving}
          className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            savedSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-comus-navy hover:bg-comus-navy-light text-white'
          }`}
        >
          <CheckCircle className={`w-3.5 h-3.5 ${savedSuccess ? 'text-white' : 'text-emerald-400'}`} />
          <span>{savedSuccess ? 'Kayıtlara işlendi' : isSaving ? 'Kaydediliyor...' : 'Kayıtlara işle'}</span>
        </button>
      </div>
      {saveError && (
        <p role="alert" className="mt-2 text-[11px] font-medium text-rose-600">
          {saveError}
        </p>
      )}
    </div>
  );
};
