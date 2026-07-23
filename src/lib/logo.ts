import { LOGO_BASE64 } from './logoBase64';
import logoAsset from '../assets/images/logo_boa_sorte_transparent.png';

export { LOGO_BASE64 };

export const PRIMARY_LOGO_URL = '/logo_boa_sorte.png';
export const FALLBACK_LOGO_URL = logoAsset;

/**
 * Retorna a melhor URL para a logo com fallback inteligente
 */
export function getLogoUrl(): string {
  return PRIMARY_LOGO_URL;
}
