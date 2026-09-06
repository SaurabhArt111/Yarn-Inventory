import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import PwaUpdateNotifier from './pwa/PwaUpdateNotifier.jsx';
import InstallPrompt from './pwa/InstallPrompt.jsx';
import OfflineBanner from './pwa/OfflineBanner.jsx';
import './styles/base.css';
import './styles/components.css';
import './styles/polish.css';
import './styles/pwa.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <OfflineBanner />
          <PwaUpdateNotifier />
          <AuthProvider>
            <App />
          </AuthProvider>
          <InstallPrompt />
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
