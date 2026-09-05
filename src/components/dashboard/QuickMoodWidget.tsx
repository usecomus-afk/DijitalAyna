import React, { useState } from 'react';
import { Smile, CheckCircle, Plus } from 'lucide-react';
import { db } from '../../db';
import { AVATAR_IMAGES } from '../../constants/avatars';

const MOOD_OPTIONS = [
  { score: 1, avatarSrc: AVATAR_IMAGES.zorlu, label: 'Zorlu', fullLabel: 'Çok Zorlayıcı' },
  { score: 2, avatarSrc: AVATAR_IMAGES.dusuk, label: 'Düşük', fullLabel: 'Düşük Enerji' },
  { score: 3, avatarSrc: AVATAR_IMAGES.normal, label: 'Normal', fullLabel: 'Nötr / Normal' },
  { score: 4, avatarSrc: AVATAR_IMAGES.iyi, label: 'İyi', fullLabel: 'İyi / Dengeli' },
  { score: 5, avatarSrc: AVATAR_IMAGES.harika, label: 'Harika', fullLabel: 'Çok Dengeli / Yüksek' },
];

const AVAILABLE_TAGS = ['İş', 'Uyku', 'Zihinsel Yük', 'Sosyal', 'Açık Hava', 'Yorgunluk'];

export const QuickMoodWidget: React.FC = () => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleTag = async (tag: string) => {
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

  const handleSelectScore = async (score: number) => {
    setSelectedScore(score);
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      let reportId = lastSavedId;
      if (reportId) {
        // Update existing active session report
        await db.moodReports.update(reportId, {
          score,
          energyScore: score,
          tags: selectedTags,
          timestamp: Date.now(),
        });
      } else {
        // Create new record
        reportId = await db.moodReports.add({
          timestamp: Date.now(),
          date: todayStr,
          score,
          energyScore: score,
          tags: selectedTags,
        });
        setLastSavedId(reportId as number);
      }

      // Immediately trigger live evaluation
      const store = (await import('../../store/useAppStore')).useAppStore.getState();
      await store.runAnalysisPipeline();

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('[QuickMoodWidget] Error saving mood report:', err);
    }
  };

  const handleExplicitSave = async () => {
    if (!selectedScore) return;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (lastSavedId) {
        await db.moodReports.update(lastSavedId, {
          score: selectedScore,
          energyScore: selectedScore,
          tags: selectedTags,
          timestamp: Date.now(),
        });
      } else {
        const id = await db.moodReports.add({
          timestamp: Date.now(),
          date: todayStr,
          score: selectedScore,
          energyScore: selectedScore,
          tags: selectedTags,
        });
        setLastSavedId(id as number);
      }

      const store = (await import('../../store/useAppStore')).useAppStore.getState();
      await store.runAnalysisPipeline();

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('[QuickMoodWidget] Explicit save error:', err);
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
              Anlık Ruh Hali & Hissiyat Bildirimi
            </h4>
            <span className="text-[11px] text-comus-sand-dark">
              Pasif sensör verileriyle aynı zaman ekseninde eşleştirilir
            </span>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-fadeIn shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> Kaydedildi
          </span>
        )}
      </div>

      {/* 3D Avatar Scale (No Emojis, Bundled Avatars) */}
      <div className="grid grid-cols-5 gap-2 my-4">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.score}
            onClick={() => handleSelectScore(opt.score)}
            title={opt.fullLabel}
            className={`flex flex-col items-center justify-center h-24 sm:h-26 p-2 rounded-2xl border transition-all duration-200 group ${
              selectedScore === opt.score
                ? 'bg-comus-copper text-white border-comus-copper shadow-soft scale-105'
                : 'bg-comus-surface hover:bg-comus-copper-subtle/40 border-comus-sand-light/30 text-comus-navy'
            }`}
          >
            <img
              src={opt.avatarSrc}
              alt={opt.label}
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl mb-1 drop-shadow-sm group-hover:scale-110 transition-transform"
            />
            <span className="text-[10.5px] font-semibold text-center leading-none truncate max-w-full">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Quick Tags */}
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

      {/* Explicit Save Action */}
      <div className="mt-3.5 pt-2.5 border-t border-comus-sand-light/10 flex items-center justify-between gap-3">
        <span className="text-[11px] text-comus-sand-dark truncate">
          {selectedScore
            ? `${MOOD_OPTIONS.find((m) => m.score === selectedScore)?.label} seçildi (${selectedTags.length} etiket)`
            : 'Modunuzu ve etiketleri seçin'}
        </span>
        <button
          onClick={handleExplicitSave}
          disabled={!selectedScore}
          className="px-4 py-2 rounded-xl bg-comus-navy hover:bg-comus-navy-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Kayıtlara İşle</span>
        </button>
      </div>
    </div>
  );
};
