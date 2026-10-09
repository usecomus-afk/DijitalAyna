import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Save, Image as ImageIcon, Book, Moon, Camera, X } from 'lucide-react';
import { db } from '../db';
import { JournalEntry } from '../types/journal';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

export const JournalEditPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryDate = new URLSearchParams(location.search).get('date');
  const [date, setDate] = useState<string>(queryDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [dreamNotes, setDreamNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [entryId, setEntryId] = useState<number | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Load existing entry for today
  useEffect(() => {
    const loadEntry = async () => {
      const entry = await db.journalEntries.where('date').equals(date).first();
      if (entry) {
        setEntryId(entry.id);
        setNotes(entry.notes || '');
        setDreamNotes(entry.dreamNotes || '');
        setImages(entry.imageUrls || []);
      } else {
        setEntryId(undefined);
        setNotes('');
        setDreamNotes('');
        setImages([]);
      }
    };
    loadEntry();
  }, [date]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const now = Date.now();
      const entry: JournalEntry = {
        date,
        notes,
        dreamNotes,
        imageUrls: images,
        createdAt: entryId ? undefined : now,
        updatedAt: now,
      } as any;

      if (entryId) {
        entry.id = entryId;
        await db.journalEntries.put(entry);
      } else {
        const id = await db.journalEntries.add(entry);
        setEntryId(id);
      }
    } catch (e) {
      console.error('Failed to save journal:', e);
      alert('Kaydedilemedi, lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
      navigate(-1);
    }
  };

  const handleAddImage = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        setImages(prev => [...prev, image.dataUrl!]);
      }
    } catch (error) {
      console.error('Image capture failed', error);
      alert('Fotoğraf açılamadı veya iptal edildi: ' + String(error));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-stone-50 text-comus-navy pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-comus-sand-light/30 shadow-sm safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-comus-surface hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-comus-navy" />
          </button>
          
          <h1 className="text-base font-bold font-serif">Kişisel Günlük</h1>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 flex items-center gap-2 rounded-xl bg-comus-copper text-white text-xs font-bold hover:bg-comus-copper-dark transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '...' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto mt-4">
        
        {/* Date Selector */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-comus-sand-light/30 shadow-soft">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Book className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-comus-sand-dark uppercase tracking-wider block mb-0.5">Tarih</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-comus-navy focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Daily Notes */}
        <div className="bg-white p-4 rounded-3xl border border-comus-sand-light/30 shadow-soft space-y-3">
          <label className="text-xs font-bold text-comus-navy flex items-center gap-2">
            <Book className="w-4 h-4 text-comus-copper" />
            Günün Notları & Düşünceler
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bugün nasıl hissediyorsun? Neler yaşadın?"
            className="w-full h-32 p-3 rounded-2xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-sm resize-none"
          />
        </div>

        {/* Dream Notes */}
        <div className="bg-white p-4 rounded-3xl border border-comus-sand-light/30 shadow-soft space-y-3">
          <label className="text-xs font-bold text-comus-navy flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            Rüya Notları
          </label>
          <textarea
            value={dreamNotes}
            onChange={(e) => setDreamNotes(e.target.value)}
            placeholder="Dün gece ne gördün? Uyandıktan hemen sonra buraya yazabilirsin..."
            className="w-full h-24 p-3 rounded-2xl bg-indigo-50/30 border border-indigo-100 focus:outline-none focus:border-indigo-300 text-sm resize-none"
          />
        </div>

        {/* Images / Screenshots */}
        <div className="bg-white p-4 rounded-3xl border border-comus-sand-light/30 shadow-soft space-y-4">
          <label className="text-xs font-bold text-comus-navy flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            Görseller & Ekran Süresi
          </label>
          <p className="text-[11px] text-comus-sand-dark leading-relaxed">
            Telefonunuzun "Ekran Süresi" sayfasının ekran görüntüsünü veya günle ilgili önemli fotoğrafları buraya ekleyebilirsiniz.
          </p>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleAddImage(CameraSource.Photos)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-comus-surface hover:bg-stone-100 border border-comus-sand-light/50 rounded-2xl text-xs font-semibold text-comus-navy transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              Galeriden Seç
            </button>
            <button 
              onClick={() => handleAddImage(CameraSource.Camera)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-comus-surface hover:bg-stone-100 border border-comus-sand-light/50 rounded-2xl text-xs font-semibold text-comus-navy transition-colors"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              Kamera
            </button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-comus-sand-light/40 shadow-sm bg-stone-100 group">
                  <img src={img} alt="Günlük Görseli" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-rose-500/90 text-white rounded-full shadow-lg backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
