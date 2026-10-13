import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      // Guide for Android users without native prompt event
      alert('To install DigiSkool on your Android device:\n\n1. Tap the 3 dots (Menu) in Chrome\n2. Select "Install app" or "Add to Home screen"\n3. DigiSkool will install directly as a native Android app!');
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-sm flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-300">
      <div className="p-2.5 bg-[#6E1231] rounded-xl text-white shrink-0">
        <Smartphone className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white leading-tight">Install DigiSkool Android App</h4>
        <p className="text-[11px] text-slate-300 mt-0.5 truncate">
          Fast offline access &amp; instant notifications
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
