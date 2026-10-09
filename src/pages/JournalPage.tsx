import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Book, Plus, ChevronRight, Image as ImageIcon } from 'lucide-react';

export const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const entries = useLiveQuery(() => db.journalEntries.orderBy('date').reverse().toArray()) || [];

  return (
    <div className="min-h-screen bg-stone-50 text-comus-navy pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-comus-sand-light/30 shadow-sm safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold font-serif text-comus-navy flex items-center gap-2">
            <Book className="w-5 h-5 text-comus-copper" />
            Kişisel Günlüğüm
          </h1>
          <button 
            onClick={() => navigate('/journal/edit')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-comus-copper text-white shadow-md hover:bg-comus-copper-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {entries.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-comus-sand-light/30 shadow-soft text-center mt-4">
            <div className="w-16 h-16 bg-comus-copper/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Book className="w-8 h-8 text-comus-copper" />
            </div>
            <h3 className="text-base font-bold text-comus-navy mb-2">Günlüğün Boş</h3>
            <p className="text-xs text-comus-sand-dark leading-relaxed mb-6">
              Geçmiş kayıt defterin şu an boş. Günlük tutmak, duygularını ve yaşadıklarını zamanla takip etmeni sağlar.
            </p>
            <button
              onClick={() => navigate('/journal/edit')}
              className="bg-comus-navy text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-comus-navy/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              İlk Günlük Kaydını Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => {
              const d = new Date(entry.date);
              const formattedDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }).format(d);
              
              return (
                <div 
                  key={entry.id} 
                  onClick={() => navigate(`/journal/edit?date=${entry.date}`)}
                  className="bg-white rounded-3xl p-4 border border-comus-sand-light/30 shadow-soft cursor-pointer hover:shadow-md transition-shadow flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-comus-sand-light/40 shrink-0">
                    <span className="text-[10px] font-bold text-comus-copper uppercase">{new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(d)}</span>
                    <span className="text-lg font-black text-comus-navy leading-none">{d.getDate()}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-comus-navy truncate">{formattedDate}</h3>
                    <p className="text-xs text-comus-sand-dark line-clamp-2 mt-1 leading-relaxed">
                      {entry.notes || entry.dreamNotes || 'Sadece görsel eklendi.'}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      {entry.imageUrls && entry.imageUrls.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          <ImageIcon className="w-3 h-3" />
                          <span>{entry.imageUrls.length} Görsel</span>
                        </div>
                      )}
                      {(entry.dreamNotes?.trim().length || 0) > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          <Book className="w-3 h-3" />
                          <span>Rüya Notu</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 self-center">
                    <ChevronRight className="w-4 h-4 text-comus-sand-dark" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
