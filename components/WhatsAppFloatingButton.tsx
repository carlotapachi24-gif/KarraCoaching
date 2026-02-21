import React from 'react';

interface WhatsAppFloatingButtonProps {
  showBubble?: boolean;
  bubbleText?: string;
}

const WHATSAPP_URL = 'https://wa.me/34660136396';

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  showBubble = false,
  bubbleText = '',
}) => {
  return (
    <div className="fixed right-5 bottom-5 z-[90] flex items-center gap-3">
      {showBubble && bubbleText && (
        <div className="hidden sm:block bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-bold text-slate-700 whitespace-nowrap">{bubbleText}</p>
        </div>
      )}

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir WhatsApp"
        className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1fb557] text-white shadow-2xl shadow-[#25D366]/40 transition-colors flex items-center justify-center"
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-current" aria-hidden="true">
          <path d="M16.02 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.24.58 4.42 1.7 6.34L3.2 28.8l6.65-1.74a12.72 12.72 0 0 0 6.17 1.58h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05a12.7 12.7 0 0 0-9.06-3.59Zm0 23.2h-.01c-1.93 0-3.83-.52-5.49-1.49l-.39-.23-3.95 1.03 1.05-3.85-.25-.4a10.53 10.53 0 0 1-1.63-5.56c0-5.85 4.76-10.61 10.61-10.61 2.83 0 5.49 1.1 7.49 3.11a10.5 10.5 0 0 1 3.11 7.5c0 5.85-4.76 10.61-10.61 10.61Zm5.82-7.93c-.32-.16-1.91-.94-2.21-1.05-.29-.11-.51-.16-.72.16-.21.32-.83 1.05-1.01 1.26-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.89-1.78-2.21-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.37-.26-.62-.53-.53-.72-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.69 0 1.58 1.15 3.11 1.31 3.32.16.21 2.26 3.45 5.47 4.83.76.33 1.36.53 1.82.68.77.25 1.47.22 2.02.13.62-.09 1.91-.78 2.18-1.53.27-.75.27-1.4.19-1.53-.08-.14-.29-.22-.61-.38Z" />
        </svg>
      </a>
    </div>
  );
};

