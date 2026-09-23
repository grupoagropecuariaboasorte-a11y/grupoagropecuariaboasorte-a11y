import { registerPlugin } from '@capacitor/core';

export const CURRENT_APP_VERSION = 'V6.0';
export const GITHUB_REPO_OWNER = 'grupoagropecuariaboasorte-a11y';
export const GITHUB_REPO_NAME = 'grupoagropecuariaboasorte-a11y';

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  releaseDate: string;
  apkDownloadUrl: string | null;
  releasePageUrl: string;
}

interface AppUpdateInstallerInterface {
  installApkFromBase64(options: { base64: string; fileName: string }): Promise<{ success: boolean; message?: string }>;
  openBrowserDownload(options: { url: string }): Promise<{ success: boolean }>;
}

const AppUpdateInstaller = registerPlugin<AppUpdateInstallerInterface>('AppUpdateInstaller');

/**
 * Detecta se o aplicativo está rodando estritamente dentro do ambiente Android nativo do Capacitor
 */
export function isAndroidCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  
  const isNative = typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : Boolean(cap.isNative);
  const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : cap.platform;
  
  return isNative && platform === 'android';
}

/**
 * Compara duas versões semânticas (ex: "v6.0" vs "v6.1" ou "6.0.1")
 * Retorna:
 *  1 se v1 > v2
 * -1 se v1 < v2
 *  0 se v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').toLowerCase().replace(/^v/, '').trim();
  const clean2 = (v2 || '').toLowerCase().replace(/^v/, '').trim();

  if (clean1 === clean2) return 0;

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Consulta a Latest Release do GitHub e verifica se há uma nova versão disponível
 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult | null> {
  // Apenas no ambiente nativo do Android
  if (!isAndroidCapacitor()) {
    return null;
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      // Caso 404 (ainda sem release criada no GitHub) ou limite de taxa
      return null;
    }

    const data: GitHubRelease = await response.json();
    if (!data || !data.tag_name) {
      return null;
    }

    const latestTag = data.tag_name;
    const isNewer = compareVersions(latestTag, CURRENT_APP_VERSION) > 0;

    if (!isNewer) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: latestTag,
        releaseNotes: data.body || '',
        releaseDate: data.published_at,
        apkDownloadUrl: null,
        releasePageUrl: data.html_url
      };
    }

    // Procura o arquivo .apk anexado nos assets da Release
    const apkAsset = data.assets?.find(a => a.name.toLowerCase().endsWith('.apk'));
    const apkUrl = apkAsset ? apkAsset.browser_download_url : null;

    return {
      hasUpdate: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestTag,
      releaseNotes: data.body || '',
      releaseDate: data.published_at,
      apkDownloadUrl: apkUrl,
      releasePageUrl: data.html_url
    };
  } catch (err) {
    console.warn('[AppUpdate] Erro ao consultar GitHub Releases:', err);
    return null;
  }
}

/**
 * Baixa o APK com acompanhamento de progresso e dispara o instalador nativo do Android
 */
export async function downloadAndInstallApk(
  apkUrl: string, 
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<void> {
  if (!apkUrl) {
    throw new Error('URL do APK não fornecida.');
  }

  onProgress?.(5, 'Iniciando download do pacote...');

  try {
    const response = await fetch(apkUrl);
    if (!response.ok) {
      throw new Error(`Falha no download (HTTP ${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    let receivedBytes = 0;
    const reader = response.body?.getReader();

    if (!reader) {
      // Fallback sem streams: lê blob completo
      onProgress?.(50, 'Baixando arquivo...');
      const blob = await response.blob();
      onProgress?.(90, 'Processando pacote para instalação...');
      const base64 = await blobToBase64(blob);
      await AppUpdateInstaller.installApkFromBase64({
        base64,
        fileName: 'agrogestao-update.apk'
      });
      return;
    }

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (totalBytes > 0) {
          const percent = Math.min(92, Math.round((receivedBytes / totalBytes) * 90));
          const mbDownloaded = (receivedBytes / (1024 * 1024)).toFixed(1);
          const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
          onProgress?.(percent, `Baixando atualização: ${mbDownloaded} MB / ${mbTotal} MB (${percent}%)`);
        } else {
          const mbDownloaded = (receivedBytes / (1024 * 1024)).toFixed(1);
          onProgress?.(50, `Baixando atualização: ${mbDownloaded} MB...`);
        }
      }
    }

    onProgress?.(94, 'Preparando instalador nativo do Android...');

    // Concatena os chunks
    const allBytes = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      allBytes.set(chunk, offset);
      offset += chunk.length;
    }

    const base64 = uint8ArrayToBase64(allBytes);

    onProgress?.(98, 'Iniciando atualização...');
    await AppUpdateInstaller.installApkFromBase64({
      base64,
      fileName: 'agrogestao-update.apk'
    });

    onProgress?.(100, 'Instalador acionado com sucesso!');
  } catch (err: any) {
    console.warn('[AppUpdate] Erro durante o download direto do APK. Recorrendo ao navegador nativo:', err);
    // Em caso de bloqueio de CORS ou falha de buffer no WebView, abre o download no navegador nativo do Android
    onProgress?.(100, 'Abrindo download no navegador...');
    await AppUpdateInstaller.openBrowserDownload({ url: apkUrl });
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
