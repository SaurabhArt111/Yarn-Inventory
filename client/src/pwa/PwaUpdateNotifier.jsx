import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../context/ToastContext.jsx';

// How often to poll for a new deployed version while the app is left
// open in a tab (service workers don't push updates to you -- you have
// to ask). 30 minutes is a reasonable balance between "finds updates
// promptly" and "doesn't hammer the server".
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

function UpdateToastBody({ onReload }) {
  return (
    <div className="pwa-toast-body">
      <div>
        <strong>Update available.</strong>
        <div className="pwa-toast-sub">A new version of the app has been downloaded.</div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={onReload}>
        Reload
      </button>
    </div>
  );
}

// Renders nothing itself -- it just registers the service worker and
// pushes toasts through the app's existing ToastContext when there's
// something worth telling the person about. Mount once, near the root.
export default function PwaUpdateNotifier() {
  const toast = useToast();
  const shownOfflineReady = useRef(false);
  const shownUpdatePrompt = useRef(false);

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Ask the browser to check for a new service-worker script
      // periodically. This is what makes updates "automatic" -- the app
      // notices a new deploy on its own instead of waiting for a full
      // browser restart.
      setInterval(() => {
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  useEffect(() => {
    if (offlineReady && !shownOfflineReady.current) {
      shownOfflineReady.current = true;
      toast.info('Yarn ERP is ready to work offline.');
    }
  }, [offlineReady, toast]);

  useEffect(() => {
    if (needRefresh && !shownUpdatePrompt.current) {
      shownUpdatePrompt.current = true;
      toast.show(<UpdateToastBody onReload={() => updateServiceWorker(true)} />, 'info', 0);
    }
  }, [needRefresh, toast, updateServiceWorker]);

  return null;
}
