import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registro de Service Worker e PWA (Agropecuária Boa Sorte)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  // Registra Service Worker apenas no navegador web (PWA), e ignora no APK nativo do Capacitor
  const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:');
  if ('serviceWorker' in navigator && !isCapacitorNative) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso no escopo:', registration.scope);
          // Força verificação de atualização no servidor a cada inicialização
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[PWA] Erro ao registrar Service Worker:', err);
        });

      // Escuta mudanças de controlador para recarregar se houver nova versão
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

