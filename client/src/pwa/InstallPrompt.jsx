import { useEffect, useState } from 'react';

const DISMISS_KEY = 'yarn-erp:install-prompt-dismissed-at';
const DISMISS_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    // Legacy iOS Safari flag -- not in any TS lib, hence the guard above.
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function recentlyDismissed() {
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  return Date.now() - Number(raw) < DISMISS_SNOOZE_MS;
}

function dismiss(setVisible) {
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  setVisible(false);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    function onInstalled() {
      setVisible(false);
      setIosVisible(false);
      setDeferredPrompt(null);
    }
    window.addEventListener('appinstalled', onInstalled);

    // Chrome/Edge/Samsung Internet fire beforeinstallprompt; Safari on
    // iOS never does, so it gets its own gentle, dismissible hint.
    if (isIos()) {
      setIosVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (visible && deferredPrompt) {
    return (
      <div className="pwa-install-banner" role="dialog" aria-label="Install Yarn ERP">
        <div className="pwa-install-icon" aria-hidden="true">
          <img src="/icons/pwa-192x192.png" alt="" width="36" height="36" />
        </div>
        <div className="pwa-install-copy">
          <strong>Install Yarn ERP</strong>
          <span>Launch it like a native app, right from your desktop or home screen.</span>
        </div>
        <div className="pwa-install-actions">
          <button className="btn btn-primary btn-sm" onClick={handleInstall}>
            Install
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => dismiss(setVisible)}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (iosVisible && !recentlyDismissed()) {
    return (
      <div className="pwa-install-banner" role="dialog" aria-label="Install Yarn ERP">
        <div className="pwa-install-icon" aria-hidden="true">
          <img src="/icons/pwa-192x192.png" alt="" width="36" height="36" />
        </div>
        <div className="pwa-install-copy">
          <strong>Install Yarn ERP</strong>
          <span>
            Tap <span className="pwa-share-glyph" aria-hidden="true">⬆</span> Share, then "Add to Home Screen".
          </span>
        </div>
        <div className="pwa-install-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => dismiss(setIosVisible)}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
}
