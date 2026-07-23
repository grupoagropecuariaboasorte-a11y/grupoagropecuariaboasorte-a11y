import React, { useState } from 'react';
import { PRIMARY_LOGO_URL, FALLBACK_LOGO_URL, LOGO_BASE64 } from '../lib/logo';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  className = "w-10 h-10 rounded-full border border-amber-400/30 object-cover shadow-md shrink-0", 
  alt = "Boa Sorte Logo" 
}) => {
  // Tenta carregar do caminho público estático, depois asset importado, depois Base64 permanente
  const [imgSrc, setImgSrc] = useState<string>(PRIMARY_LOGO_URL);
  const [errorCount, setErrorCount] = useState<number>(0);

  const handleError = () => {
    if (errorCount === 0) {
      setErrorCount(1);
      setImgSrc(FALLBACK_LOGO_URL);
    } else if (errorCount === 1) {
      setErrorCount(2);
      setImgSrc(LOGO_BASE64);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );
};

export default AppLogo;
