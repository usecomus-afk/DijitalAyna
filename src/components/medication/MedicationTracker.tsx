import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Medication } from '../../types/medication';
import { Pill, Plus, Trash2, Calendar, Clock, Edit3, CheckCircle2 } from 'lucide-react';

export const MedicationTracker: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [dosageMg, setDosageMg] = useState<number>(10);
  const [frequencyPerDay, setFrequencyPerDay] = useState<number>(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const medications = useLiveQuery(() => db.medications.toArray()) || [];
  const todaysLogs = useLiveQuery(() => db.medicationLogs.where('date').equals(todayStr).toArray()) || [];

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await db.medications.update(editingId, {
        name: name.trim(),
        dosageMg: Number(dosageMg) || 10,
        frequencyPerDay: Number(frequencyPerDay) || 1,
        startDate,
        notes: notes.trim() || undefined,
      });
      setEditingId(null);
    } else {
      await db.medications.add({
        name: name.trim(),
        dosageMg: Number(dosageMg) || 10,
        frequencyPerDay: Number(frequencyPerDay) || 1,
        startDate,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      });
    }

    // Reset Form
    setName('');
    setDosageMg(10);
    setFrequencyPerDay(1);
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsAdding(false);
  };

  const handleEdit = (med: Medication) => {
    setName(med.name);
    setDosageMg(med.dosageMg);
    setFrequencyPerDay(med.frequencyPerDay);
    setStartDate(med.startDate);
    setNotes(med.notes || '');
    setEditingId(med.id || null);
    setIsAdding(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu ilacı ve geçmiş takip kayıtlarını silmek istediğinize emin misiniz?')) {
      await db.medications.delete(id);
      await db.medicationLogs.where('medicationId').equals(id).delete();
    }
  };

  const toggleTakeDose = async (medId: number) => {
    const existing = todaysLogs.find((l) => l.medicationId === medId);
    if (existing && existing.id) {
      await db.medicationLogs.delete(existing.id);
    } else {
      await db.medicationLogs.add({
        medicationId: medId,
        date: todayStr,
        timestamp: Date.now(),
        taken: true,
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-comus-sand-light/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy leading-tight">
              Psikiyatri İlaç & Tedavi Takibi
            </h3>
            <p className="text-xs text-comus-sand-dark mt-0.5">
              Reçeteli ilaçlarınızı girin; davranışsal ve sirkadiyen etkileri grafiklerde üst üste izleyin
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) setEditingId(null);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-comus-navy text-white text-xs font-semibold hover:bg-comus-navy-light shadow-soft transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? 'Vazgeç' : 'İlaç Ekle'}</span>
        </button>
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <form onSubmit={handleSaveMedication} className="p-5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy">
              {editingId ? 'İlacı Düzenle' : 'Yeni İlaç Kaydı Oluştur'}
            </h4>
            <span className="text-[11px] text-comus-sand-dark">Veriler cihazınızda şifreli tutulur</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-comus-navy block mb-1">
                İlaç Adı:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Escitalopram, Lityum, Seroquel, Prozac"
                className="w-full text-xs p-3 rounded-xl bg-white border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-comus-navy block mb-1">
                  Dozaj (mg):
                </label>
                <input
                  type="number"
                  value={dosageMg}
                  onChange={(e) => setDosageMg(Number(e.target.value))}
                  min={1}
                  step={0.5}
                  className="w-full text-xs p-3 rounded-xl bg-white border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-comus-navy block mb-1">
                  Günlük Frekans:
                </label>
                <select
                  value={frequencyPerDay}
                  onChange={(e) => setFrequencyPerDay(Number(e.target.value))}
                  className="w-full text-xs p-3 rounded-xl bg-white border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper"
                >
                  <option value={1}>Günde 1 Kez</option>
                  <option value={2}>Günde 2 Kez</option>
                  <option value={3}>Günde 3 Kez</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-comus-navy block mb-1">
                Başlangıç Tarihi:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-white border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-comus-navy block mb-1">
                Doktor / Kullanım Notu (Opsiyonel):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: Sabah tok karnına, 2 hafta sonra kontrol"
                className="w-full text-xs p-3 rounded-xl bg-white border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-comus-sand-dark hover:bg-white"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs font-semibold shadow-soft"
            >
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}

      {/* Daily Checklist & Medication List */}
      {medications.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-comus-navy flex items-center justify-between">
            <span>Bugünün İlaç Takip Durumu ({new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })})</span>
            <span className="text-comus-copper text-[11px] font-semibold">
              {todaysLogs.length} / {medications.length} Doz Alındı
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {medications.map((med) => {
              const isTakenToday = todaysLogs.some((l) => l.medicationId === med.id);
              const daysRunning = Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(med.startDate).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1
              );

              return (
                <div
                  key={med.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isTakenToday
                      ? 'bg-teal-50/50 border-teal-200'
                      : 'bg-white border-comus-sand-light/30 shadow-soft'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => med.id && toggleTakeDose(med.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isTakenToday
                          ? 'bg-teal-600 text-white'
                          : 'bg-comus-surface border border-comus-sand-light/40 text-comus-sand hover:text-comus-navy'
                      }`}
                      title={isTakenToday ? 'Alındı olarak işaretlendi' : 'Bugün alındı olarak işaretle'}
                    >
                      {isTakenToday ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-comus-navy text-xs sm:text-sm truncate">
                          {med.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-800 shrink-0 font-mono">
                          {med.dosageMg} mg
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-comus-sand-dark mt-0.5">
                        <span className="flex items-center gap-1 font-medium text-comus-navy">
                          <Calendar className="w-3 h-3 text-comus-copper shrink-0" />
                          <span>{daysRunning}. Gün</span>
                        </span>
                        <span>• Günde {med.frequencyPerDay}x</span>
                        {med.notes && <span className="truncate italic text-comus-sand-dark">({med.notes})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(med)}
                      className="p-1.5 text-comus-sand-dark hover:text-comus-navy rounded-lg hover:bg-comus-surface"
                      title="Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => med.id && handleDelete(med.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 px-4 rounded-2xl bg-comus-surface border border-dashed border-comus-sand-light/40 space-y-2">
          <Pill className="w-8 h-8 text-comus-sand mx-auto" />
          <p className="text-xs sm:text-sm font-semibold text-comus-navy">
            Henüz kayıtlı bir ilaç bulunmuyor
          </p>
          <p className="text-xs text-comus-sand-dark max-w-sm mx-auto leading-relaxed">
            Kullandığınız psikiyatri/nöroloji ilaçlarını ekleyerek yazım dinamikleri, uyku ve sirkadiyen ritim üzerindeki etkilerini otomatik takip edebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
};
