import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquarePlus,
  User,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface FeedbackFullScreenPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const TARGET_FEEDBACK_EMAIL = 'hi@usecomus.com';

export const FeedbackFullScreenPage: React.FC<FeedbackFullScreenPageProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile } = useAppStore();

  const [fullName, setFullName] = useState<string>(userProfile?.name || '');
  const [email, setEmail] = useState<string>(userProfile?.email || '');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName((prev) => prev || userProfile?.name || '');
      setEmail((prev) => prev || userProfile?.email || '');
      setErrorMsg(null);
      setSubmitted(false);
    }
  }, [isOpen, userProfile?.name, userProfile?.email]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      setErrorMsg('Lütfen Ad-Soyad, E-posta Adresi, Konu ve Geri Bildirim Mesajı alanlarının tamamını doldurun.');
      return;
    }

    setIsSubmitting(true);

    const formattedSubject = `[Dijital Mental İkizim Geri Bildirim] ${trimmedSubject}`;
    const formattedBody = [
      `Ad - Soyad: ${trimmedName}`,
      `E-posta Adresi: ${trimmedEmail}`,
      `Konu: ${trimmedSubject}`,
      '',
      'Geri Bildirim Mesajı:',
      trimmedMessage,
      '',
      `— Dijital Mental İkizim (${new Date().toLocaleString('tr-TR')})`,
    ].join('\n');

    try {
      // 1. Attempt background email relay via FormSubmit AJAX endpoint to hi@usecomus.com
      fetch(`https://formsubmit.co/ajax/${TARGET_FEEDBACK_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          _replyto: trimmedEmail,
          _subject: formattedSubject,
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      }).catch(() => {});

      // 2. Open mailto:hi@usecomus.com so native iOS/desktop mail client sends directly to hi@usecomus.com
      const mailtoUrl = `mailto:${TARGET_FEEDBACK_EMAIL}?subject=${encodeURIComponent(
        formattedSubject
      )}&body=${encodeURIComponent(formattedBody)}`;

      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSubmitted(true);
      setSubject('');
      setMessage('');
    } catch (_) {
      setErrorMsg('Geri bildirim gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="feedback-fullscreen-page"
      className="fixed inset-0 z-[99999] w-screen h-[100dvh] bg-comus-bg text-comus-navy flex flex-col overflow-y-auto animate-fadeIn"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 24px), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
      }}
    >
      {/* Top Bar */}
      <div className="px-4 sm:px-6 pb-3 border-b border-comus-sand-light/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shadow-2xs">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg sm:text-xl text-comus-navy leading-tight">
              Geri Bildirim Gönder
            </h1>
            <p className="text-xs text-comus-sand-dark">
              Görüş ve önerileriniz {TARGET_FEEDBACK_EMAIL} adresine iletilir
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="w-10 h-10 rounded-2xl bg-white border border-comus-sand-light/40 shadow-soft flex items-center justify-center text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col justify-between">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-comus-sand-light/30 flex-1 flex flex-col justify-between gap-4"
        >
          <div className="space-y-3.5 flex-1 flex flex-col">
            {/* Ad - Soyad */}
            <div>
              <label
                htmlFor="feedback-fullname"
                className="block text-xs font-bold text-comus-navy mb-1.5"
              >
                Ad - Soyad
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-comus-copper absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="feedback-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adınız ve Soyadınız"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-comus-surface border border-comus-sand-light/40 text-sm text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:border-comus-copper focus:ring-2 focus:ring-comus-copper/15 transition-all"
                />
              </div>
            </div>

            {/* E-posta Adresi */}
            <div>
              <label
                htmlFor="feedback-email"
                className="block text-xs font-bold text-comus-navy mb-1.5"
              >
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-comus-copper absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@eposta.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-comus-surface border border-comus-sand-light/40 text-sm text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:border-comus-copper focus:ring-2 focus:ring-comus-copper/15 transition-all"
                />
              </div>
            </div>

            {/* Konu */}
            <div>
              <label
                htmlFor="feedback-subject"
                className="block text-xs font-bold text-comus-navy mb-1.5"
              >
                Konu
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-comus-copper absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="feedback-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Geri bildiriminizin konusu"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-comus-surface border border-comus-sand-light/40 text-sm text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:border-comus-copper focus:ring-2 focus:ring-comus-copper/15 transition-all"
                />
              </div>
            </div>

            {/* Geri Bildirim Mesaj Alanı */}
            <div className="flex-1 flex flex-col min-h-[140px]">
              <label
                htmlFor="feedback-message"
                className="block text-xs font-bold text-comus-navy mb-1.5"
              >
                Geri Bildirim Mesajınız
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Deneyiminizi, önerilerinizi veya karşılaştığınız durumu buraya yazabilirsiniz..."
                required
                rows={5}
                className="w-full flex-1 p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/40 text-sm text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:border-comus-copper focus:ring-2 focus:ring-comus-copper/15 transition-all resize-none"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {submitted && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Geri bildiriminiz <strong>{TARGET_FEEDBACK_EMAIL}</strong> adresine gönderilmek üzere iletildi. Teşekkür ederiz!
                </span>
              </div>
            )}
          </div>

          {/* Gönder Butonu */}
          <div className="pt-2 border-t border-comus-sand-light/20 shrink-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white font-semibold text-sm shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Gönderiliyor...' : 'Gönder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
