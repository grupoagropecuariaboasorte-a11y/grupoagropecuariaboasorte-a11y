import { useState, useEffect } from 'react';

export interface Tablet12InchStatus {
  isTablet: boolean;
  isOverride: boolean;
  estimatedInches: number;
  hasTouch: boolean;
  toggleOverride: () => void;
}

const OVERRIDE_KEY = 'agro_tablet_12_override';

export function useTablet12Inch(): Tablet12InchStatus {
  const [status, setStatus] = useState<Tablet12InchStatus>({
    isTablet: false,
    isOverride: false,
    estimatedInches: 0,
    hasTouch: false,
    toggleOverride: () => {}
  });

  useEffect(() => {
    function evaluateTablet() {
      if (typeof window === 'undefined') return;

      // 1. Verificar override de teste no localStorage ou URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlOverride = urlParams.get('tablet12') === 'true';
      const storedOverride = localStorage.getItem(OVERRIDE_KEY) === 'true';
      const isOverride = urlOverride || storedOverride;

      // 2. Verificar capacidade de toque (touchscreen)
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;

      // 3. Calcular polegadas aproximadas da tela (diagonal) para tablets entre 11 e 13,5 polegadas (foco 12,8")
      const logicalWidth = window.screen.width || window.innerWidth;
      const logicalHeight = window.screen.height || window.innerHeight;
      const diagPx = Math.sqrt(logicalWidth * logicalWidth + logicalHeight * logicalHeight);

      // Em tablets modernos (ex: iPad Pro 12.9", Galaxy Tab 12.4" a 14.6", Android 12.8"),
      // a densidade lógica de pixels (PPI lógico) fica em torno de 132 a 150 PPI.
      const inches132 = diagPx / 132;
      const inches150 = diagPx / 150;
      const avgInches = parseFloat(((inches132 + inches150) / 2).toFixed(1));

      // Detectar se está entre 11 e 13.5 polegadas (incluindo 12,8") com toque, OU por User Agent / resolução de tablet
      const isTabletScreenRange =
        (avgInches >= 10.8 && avgInches <= 13.8) ||
        (inches132 >= 10.8 && inches132 <= 13.8) ||
        (inches150 >= 10.8 && inches150 <= 13.8);

      const isTabletResolution =
        hasTouch &&
        logicalWidth >= 768 &&
        logicalWidth <= 1400 &&
        logicalHeight >= 600 &&
        logicalHeight <= 1400;

      const isDetectedTablet = (hasTouch && (isTabletScreenRange || isTabletResolution)) || isOverride;

      // 4. Aplicar ou remover classe CSS no <html> e <body> para acionar layout otimizado para toque
      const root = document.documentElement;
      const body = document.body;

      if (isDetectedTablet) {
        root.classList.add('is-tablet-12inch');
        body.classList.add('is-tablet-12inch');
      } else {
        root.classList.remove('is-tablet-12inch');
        body.classList.remove('is-tablet-12inch');
      }

      setStatus({
        isTablet: isDetectedTablet,
        isOverride,
        estimatedInches: avgInches,
        hasTouch,
        toggleOverride: () => {
          const nextState = !isOverride;
          if (nextState) {
            localStorage.setItem(OVERRIDE_KEY, 'true');
          } else {
            localStorage.removeItem(OVERRIDE_KEY);
          }
          evaluateTablet();
        }
      });
    }

    evaluateTablet();

    window.addEventListener('resize', evaluateTablet);
    window.addEventListener('orientationchange', evaluateTablet);

    return () => {
      window.removeEventListener('resize', evaluateTablet);
      window.removeEventListener('orientationchange', evaluateTablet);
    };
  }, []);

  return status;
}
