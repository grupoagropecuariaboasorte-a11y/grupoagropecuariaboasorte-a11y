import { useState } from 'react';
import { Download, Sparkles, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';
import { UpdateCheckResult, downloadAndInstallApk } from '../lib/appUpdateService';
import AppLogo from './AppLogo';

interface AppUpdateModalProps {
  updateInfo: UpdateCheckResult;
  onClose: () => void;
}

export default function AppUpdateModal({ updateInfo, onClose }: AppUpdateModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleStartUpdate = async () => {
    if (!updateInfo.apkDownloadUrl) {
      // Se não houver APK anexado nos assets da Release, abre a página da Release no navegador
      window.open(updateInfo.releasePageUrl, '_blank');
      return;
    }

    setDownloading(true);
    setErrorMessage('');
    setProgress(5);
    setStatusMessage('Conectando ao servidor...');

    try {
      await downloadAndInstallApk(updateInfo.apkDownloadUrl, (p, msg) => {
        setProgress(p);
        setStatusMessage(msg);
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao baixar o instalador da atualização.');
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Botão fechar se não estiver no meio do download */}
        {!downloading && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        )}

        {/* Topo com Identidade Agropecuária */}
        <div className="bg-[#1B3022] text-white p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <AppLogo className="w-12 h-12 object-contain" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold tracking-wide uppercase mb-1 border border-emerald-400/30">
            <Sparkles size={12} />
            <span>Nova Versão Disponível</span>
          </div>

          <h2 className="text-lg font-black tracking-tight">AgroGestão Boa Sorte</h2>
          <p className="text-xs text-white/80 mt-0.5">Atualização do Aplicativo Android</p>
        </div>

        {/* Corpo Informativo */}
        <div className="p-6 space-y-4">
          {/* Comparativo de Versão */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <div className="border-r border-slate-200 pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Versão Instalada</span>
              <span className="text-sm font-black font-mono text-slate-600">{updateInfo.currentVersion}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Nova Versão</span>
              <span className="text-sm font-black font-mono text-emerald-700 flex items-center justify-center gap-1">
                {updateInfo.latestVersion}
                <CheckCircle2 size={13} className="text-emerald-600" />
              </span>
            </div>
          </div>

          {/* Notas de Atualização (Changelog) */}
          {updateInfo.releaseNotes && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-h-36 overflow-y-auto text-left">
              <span className="text-[11px] uppercase font-bold text-slate-700 tracking-wider block mb-1">
                O que há de novo:
              </span>
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {updateInfo.releaseNotes}
              </p>
            </div>
          )}

          {/* Erro se houver */}
          {errorMessage && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl">
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Área de Progresso de Download */}
          {downloading ? (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span className="truncate pr-2">{statusMessage || 'Baixando atualização...'}</span>
                <span className="font-mono text-[#1B3022]">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-0.5">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Mantenha o aplicativo aberto durante o download.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleStartUpdate}
                className="w-full py-3 px-4 bg-[#1B3022] hover:bg-[#122218] text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {updateInfo.apkDownloadUrl ? (
                  <>
                    <Download size={16} />
                    <span>Atualizar Agora</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    <span>Ver no GitHub Releases</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 text-slate-500 font-medium text-xs rounded-xl cursor-pointer transition-all text-center"
              >
                Lembrar mais tarde
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
