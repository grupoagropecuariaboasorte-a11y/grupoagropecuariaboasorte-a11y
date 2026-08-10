import React, { useEffect, useState, useRef } from 'react';
import { fleetService } from '../lib/fleetService';
import { Farm, LookupItem, UserProfile, DeletedItemLog, UserRole } from '../types';
import Modal from '../components/Modal';
import { isDemoMode, isSchemaMissing } from '../lib/supabaseClient';
import SupabaseSetupAssistant from '../components/SupabaseSetupAssistant';
import { 
  Settings, Database, Play, Trash2, Plus, RefreshCw, 
  Map, Server, ShieldCheck, AlertCircle, Info, Pencil,
  Download, Upload, HardDrive, FileJson, CheckCircle2, Check,
  Users, User, History, Search, Filter, Clock, Key, Lock, Eye, EyeOff
} from 'lucide-react';

interface SettingsProps {
  userRole: UserRole;
  onRefreshFarms?: () => void;
}

export default function SettingsPage({ userRole, onRefreshFarms }: SettingsProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Cadastrar Farm
  const [isFarmOpen, setIsFarmOpen] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');

  // Form Editar Farm
  const [isEditFarmOpen, setIsEditFarmOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [editFarmName, setEditFarmName] = useState('');
  const [editFarmLocation, setEditFarmLocation] = useState('');

  // Backup & Restore
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gerenciamento de Usuários (Apenas Admin)
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});

  // Modal de Redefinição de Senha
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Histórico de Itens Removidos / Excluídos
  const [deletedLogs, setDeletedLogs] = useState<DeletedItemLog[]>([]);
  const [loadingDeletedLogs, setLoadingDeletedLogs] = useState(false);
  const [deletedSearch, setDeletedSearch] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');

  const fetchDeletedLogs = async () => {
    setLoadingDeletedLogs(true);
    try {
      const history = await fleetService.getDeletedItems();
      setDeletedLogs(history);
    } catch (err) {
      console.error('Erro ao carregar histórico de exclusões:', err);
    } finally {
      setLoadingDeletedLogs(false);
    }
  };

  useEffect(() => {
    fetchDeletedLogs();
  }, []);

  const handleClearDeletedLogs = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o histórico de itens excluídos? Esta ação não afetará os dados atuais do sistema.')) {
      return;
    }
    try {
      await fleetService.clearDeletedItemsHistory();
      setDeletedLogs([]);
      alert('Histórico de remoções limpo com sucesso.');
    } catch (err: any) {
      alert('Erro ao limpar histórico: ' + (err?.message || err));
    }
  };

  const filteredDeletedLogs = deletedLogs.filter(item => {
    const matchesModule = selectedModuleFilter === 'ALL' || item.module === selectedModuleFilter;
    const searchLower = deletedSearch.toLowerCase();
    const matchesSearch = !deletedSearch || 
      item.item_description.toLowerCase().includes(searchLower) ||
      item.deleted_by.toLowerCase().includes(searchLower) ||
      item.module.toLowerCase().includes(searchLower) ||
      (item.notes && item.notes.toLowerCase().includes(searchLower));
    return matchesModule && matchesSearch;
  });

  const fetchUsers = async () => {
    if (userRole !== 'admin') return;
    setLoadingUsers(true);
    try {
      const list = await fleetService.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Erro ao carregar lista de usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole]);

  const handleRoleChange = async (userId: string, targetEmail: string, newRole: UserRole) => {
    if (targetEmail.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com' && newRole !== 'admin') {
      alert('O usuário administrador principal do sistema não pode ter sua permissão alterada.');
      return;
    }
    try {
      setUpdatingUserId(userId);
      await fleetService.updateProfileRole(userId, newRole, targetEmail);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
      const roleLabels: Record<string, string> = {
        registered: 'Cadastrado (Sem Acesso)',
        admin: 'Administrador',
        control: 'Controle',
        fuel: 'Abastecimento',
        mechanic: 'Mecânico',
        editor: 'Editor',
        viewer: 'Visualizador'
      };
      alert(`Permissão do usuário ${targetEmail} atualizada para ${roleLabels[newRole] || newRole}.`);
    } catch (err: any) {
      alert('Erro ao atualizar permissão do usuário: ' + (err?.message || err));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenResetPasswordModal = (user: UserProfile) => {
    setResetTargetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResetError('');
    setResetSuccess('');
    setIsResetPasswordOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!newPassword || newPassword.trim().length === 0) {
      setResetError('Por favor, informe a nova senha.');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (!resetTargetUser) return;

    setResetLoading(true);
    try {
      const res = await fleetService.resetUserPassword(resetTargetUser.id, resetTargetUser.email, newPassword);
      setResetSuccess(res?.message || 'Senha atualizada com sucesso no Supabase!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsResetPasswordOpen(false);
        setResetSuccess('');
      }, 1800);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setResetError(err?.message || 'Erro ao redefinir a senha do usuário.');
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fList, lList] = await Promise.all([
          fleetService.getFarms(),
          fleetService.getLookups()
        ]);
        setFarms(fList);
        setLookups(lList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshList = async () => {
    const [fList, lList] = await Promise.all([
      fleetService.getFarms(),
      fleetService.getLookups()
    ]);
    setFarms(fList);
    setLookups(lList);
    if (onRefreshFarms) {
      onRefreshFarms();
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleetService.addFarm({
        name: farmName,
        location: farmLocation
      });
      setIsFarmOpen(false);
      setFarmName('');
      setFarmLocation('');
      refreshList();
    } catch (err: any) {
      alert('Erro ao cadastrar fazenda: ' + err.message);
    }
  };

  const handleOpenEditFarm = (farm: Farm) => {
    setEditingFarm(farm);
    setEditFarmName(farm.name);
    setEditFarmLocation(farm.location || '');
    setIsEditFarmOpen(true);
  };

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm) return;
    try {
      await fleetService.updateFarm(editingFarm.id, {
        name: editFarmName,
        location: editFarmLocation
      });
      setIsEditFarmOpen(false);
      setEditingFarm(null);
      refreshList();
    } catch (err: any) {
      alert('Erro ao atualizar fazenda: ' + err.message);
    }
  };

  const handleDeleteFarm = async (id: string) => {
    if (!window.confirm('Excluir esta fazenda? Todas as máquinas vinculadas perderão o vínculo.')) return;
    try {
      await fleetService.deleteFarm(id);
      refreshList();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setIsExporting(true);
      const backupData = await fleetService.exportBackup();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `backup_boa_sorte_agro_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Erro ao gerar backup: ' + (e?.message || e));
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!window.confirm('ATENÇÃO: A restauração irá importar e atualizar os dados do banco de dados com base no arquivo de backup selecionado. Deseja continuar?')) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setIsImporting(true);
        const res = await fleetService.restoreBackup(parsed);
        alert(res.summary);
        refreshList();
      } catch (err: any) {
        alert('Erro ao restaurar backup: ' + (err?.message || err));
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto mt-12 animate-fadeIn">
        <ShieldCheck size={48} className="mx-auto text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Acesso Restrito</h3>
        <p className="text-sm text-slate-600">
          A aba <strong>Configurações</strong> é de acesso exclusivo para usuários administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* HEADER */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B3022] flex items-center gap-2">
          <Settings size={18} className="text-[#1B3022] animate-spin" style={{ animationDuration: '6s' }} />
          Configurações Gerais do Sistema
        </h3>
        <p className="text-xs text-slate-500 mt-1">Gerenciamento de tabelas auxiliares, conexão com o banco e backup de dados.</p>
      </div>

      {isSchemaMissing && <SupabaseSetupAssistant />}

      {/* CONEXÃO E METADADOS */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Status Conexão */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
            <Server size={14} /> Status da Conexão do Sistema
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-normal flex items-start gap-3 shadow-2xs">
                <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-bold text-emerald-900">Produção Supabase Ativo e Online</span>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Este aplicativo está operando em modo estritamente online. Todos os seus dados, cadastros de frotas, checklists e ordens de serviço estão protegidos na nuvem do Supabase PostgreSQL em tempo real.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-center h-full">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Status do Servidor</span>
              <span className="text-xs font-mono font-bold text-[#1B3022]">Provedor: Supabase Cloud</span>
              <span className="text-[10px] text-slate-400 font-mono mt-2">Versão: v1.2.0 (Online Only)</span>
            </div>
          </div>
        </div>

        {/* Usuários - Visível Apenas para Usuário Administrador */}
        {userRole === 'admin' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users size={15} className="text-[#1B3022]" /> Usuários
              </h4>
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="text-[11px] font-semibold text-[#1B3022] hover:underline flex items-center gap-1 cursor-pointer"
                title="Atualizar lista de usuários"
              >
                <RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} />
                <span>Atualizar</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Gerenciamento de usuários cadastrados e controle das permissões de acesso ao sistema.
            </p>

            {loadingUsers ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#1B3022]" />
                <span>Carregando usuários...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">E-mail do Usuário</th>
                      <th className="py-2.5 px-3">Permissão Atual</th>
                      <th className="py-2.5 px-3 text-right">Alterar Permissão</th>
                      {(userRole === 'admin' || ((typeof window !== 'undefined' ? localStorage.getItem('agro_user_email') : '') || '').toLowerCase() === 'grupoagropecuariaboasorte@gmail.com') && (
                        <th className="py-2.5 px-3 text-center">Redefinição de Senha</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isMainAdmin = u.email.toLowerCase() === 'grupoagropecuariaboasorte@gmail.com';
                      const selectedRole = selectedRoles[u.id] || u.role;
                      const isChanged = selectedRole !== u.role;
                      const isAdminOrMaster = userRole === 'admin' || ((typeof window !== 'undefined' ? localStorage.getItem('agro_user_email') : '') || '').toLowerCase() === 'grupoagropecuariaboasorte@gmail.com';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                            <User size={14} className="text-slate-400 shrink-0" />
                            <span>{u.email}</span>
                            {isMainAdmin && (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                                Master
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : u.role === 'control'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.role === 'fuel'
                                ? 'bg-amber-100 text-amber-800'
                                : u.role === 'mechanic'
                                ? 'bg-blue-100 text-blue-800'
                                : u.role === 'registered'
                                ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role === 'admin' ? 'Administrador' :
                               u.role === 'control' ? 'Controle' :
                               u.role === 'fuel' ? 'Abastecimento' :
                               u.role === 'mechanic' ? 'Mecânico' :
                               u.role === 'registered' ? 'Cadastrado (Sem Acesso)' :
                               u.role === 'editor' ? 'Editor' : 'Visualizador'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={selectedRole}
                                disabled={isMainAdmin || updatingUserId === u.id}
                                onChange={(e) => setSelectedRoles(prev => ({ ...prev, [u.id]: e.target.value as UserRole }))}
                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#1B3022] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <option value="registered">Cadastrado (Sem Acesso)</option>
                                <option value="admin">Administrador</option>
                                <option value="control">Controle</option>
                                <option value="fuel">Abastecimento</option>
                                <option value="mechanic">Mecânico</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Visualizador</option>
                              </select>

                              <button
                                onClick={() => handleRoleChange(u.id, u.email, selectedRole)}
                                disabled={isMainAdmin || updatingUserId === u.id || !isChanged}
                                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all shadow-2xs cursor-pointer ${
                                  isChanged 
                                    ? 'bg-[#1B3022] hover:bg-[#2C4A34] text-white' 
                                    : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
                                }`}
                                title="Confirmar alteração de permissão"
                              >
                                {updatingUserId === u.id ? (
                                  <span>Salvando...</span>
                                ) : (
                                  <>
                                    <Check size={14} />
                                    <span>Confirmar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                          {isAdminOrMaster && (
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleOpenResetPasswordModal(u)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                                title={`Redefinir senha para ${u.email}`}
                              >
                                <Key size={13} />
                                <span>Redefinir Senha</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CÓPIA DE SEGURANÇA E RESTAURAÇÃO (BACKUP & RESTORE) */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
          <HardDrive size={14} className="text-[#1B3022]" /> Backup e Restauração de Dados
        </h4>
        <p className="text-xs text-slate-500 mb-5">
          Exporte uma cópia completa de segurança com todas as fazendas, máquinas, estoques de combustível, histórico e ordens de serviço em formato JSON, ou restaure um backup anterior.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Botão Fazer Backup */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                <Download size={15} className="text-emerald-700" />
                Fazer Backup dos Dados
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Baixa um arquivo <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">.json</code> contendo todo o banco de dados do sistema para guardar no seu computador ou pen drive.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full py-2.5 px-4 bg-[#1B3022] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={14} />
              {isExporting ? 'Gerando Backup...' : 'Baixar Arquivo de Backup'}
            </button>
          </div>

          {/* Botão Restaurar Backup */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                <Upload size={15} className="text-amber-700" />
                Restaurar Backup
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                Selecione um arquivo de backup <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">.json</code> gerado anteriormente para sincronizar e restaurar os registros no Supabase.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload size={14} />
                {isImporting ? 'Restaurando...' : 'Carregar e Restaurar Backup'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADMINISTRAÇÃO DE FAZENDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Fazendas Cadastradas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Map size={14} className="text-[#1B3022]" /> Fazendas Cadastradas ({farms.length})
            </h4>
            {(userRole === 'admin' || userRole === 'editor' || userRole === 'control') && (
              <button
                onClick={() => setIsFarmOpen(true)}
                className="flex items-center gap-1 text-xs text-[#1B3022] hover:opacity-80 font-bold cursor-pointer transition-all"
              >
                <Plus size={14} /> Cadastrar Fazenda
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {farms.map(f => (
              <div key={f.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:bg-slate-100/50 transition-colors shadow-2xs">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">{f.name}</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Localização: <span className="font-semibold text-slate-700">{f.location}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(userRole === 'admin' || userRole === 'editor' || userRole === 'control') && (
                    <button
                      onClick={() => handleOpenEditFarm(f)}
                      className="p-1.5 text-slate-500 hover:text-[#1B3022] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Editar Fazenda"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {userRole === 'admin' && farms.length > 1 && (
                    <button
                      onClick={() => handleDeleteFarm(f.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Fazenda"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipos Auxiliares de Cadastros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-200 pb-4">
            Parâmetros Gerais do Sistema (Lookups)
          </h4>

          <div className="space-y-4 text-xs">
            {/* Tipos Equipamento */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipos de Máquinas Reguladas</p>
              <div className="flex flex-wrap gap-1.5">
                {lookups?.equipmentTypes.map((et: LookupItem) => (
                  <span key={et.id} className="inline-block px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-mono font-bold shadow-2xs">
                    {et.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Categorias Manutencao */}
            <div className="space-y-1.5 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itens Planos Preventivos</p>
              <div className="flex flex-wrap gap-1.5">
                {lookups?.maintenanceCategories.map((mc: string) => (
                  <span key={mc} className="inline-block px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-mono font-bold shadow-2xs">
                    {mc}
                  </span>
                ))}
              </div>
            </div>

            {/* Combustível */}
            <div className="space-y-1.5 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Combustíveis Suportados</p>
              <div className="flex flex-wrap gap-1.5">
                {lookups?.fuelTypes.map((ft: LookupItem) => (
                  <span key={ft.id} className="inline-block px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-mono font-bold shadow-2xs">
                    {ft.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE ITENS REMOVIDOS DO APLICATIVO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 mb-4 gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <History size={16} className="text-rose-600" />
              Histórico de Itens Removidos / Remoções ({deletedLogs.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Registro completo de qualquer item excluído do aplicativo (máquinas, abastecimentos, estoque, manutenções, etc.) e o usuário responsável.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={fetchDeletedLogs}
              disabled={loadingDeletedLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Atualizar Histórico"
            >
              <RefreshCw size={13} className={loadingDeletedLogs ? 'animate-spin' : ''} />
              Atualizar
            </button>
            {userRole === 'admin' && deletedLogs.length > 0 && (
              <button
                onClick={handleClearDeletedLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Limpar Histórico de Remoções"
              >
                <Trash2 size={13} />
                Limpar Histórico
              </button>
            )}
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por item, usuário ou motivo..."
              value={deletedSearch}
              onChange={e => setDeletedSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B3022]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={14} className="text-slate-400 hidden sm:block" />
            <select
              value={selectedModuleFilter}
              onChange={e => setSelectedModuleFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B3022]"
            >
              <option value="ALL">Todos os Módulos ({deletedLogs.length})</option>
              <option value="Máquinas e Frota">Máquinas e Frota</option>
              <option value="Abastecimentos">Abastecimentos</option>
              <option value="Estoque de Diesel">Estoque de Diesel</option>
              <option value="Manutenções">Manutenções</option>
              <option value="Plano Preventivo">Plano Preventivo</option>
              <option value="Checklists">Checklists</option>
              <option value="Ordens de Serviço">Ordens de Serviço</option>
              <option value="Fazendas">Fazendas</option>
            </select>
          </div>
        </div>

        {/* Tabela de Itens Removidos */}
        {loadingDeletedLogs ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#1B3022]" />
            Carregando histórico de remoções...
          </div>
        ) : filteredDeletedLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Info size={20} className="mx-auto mb-2 text-slate-400" />
            {deletedLogs.length === 0 
              ? 'Nenhum item foi removido do aplicativo ainda.' 
              : 'Nenhum item removido corresponde aos filtros selecionados.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 z-10 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Data / Hora</th>
                  <th className="px-4 py-2.5">Aba / Módulo</th>
                  <th className="px-4 py-2.5">Item Removido</th>
                  <th className="px-4 py-2.5">Removido por (Usuário)</th>
                  <th className="px-4 py-2.5">Observações / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {filteredDeletedLogs.map((log) => {
                  const formattedDate = log.deleted_at
                    ? new Date(log.deleted_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'N/A';

                  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (log.module === 'Máquinas e Frota') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  else if (log.module === 'Abastecimentos') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  else if (log.module === 'Estoque de Diesel') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  else if (log.module === 'Manutenções') badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                  else if (log.module === 'Ordens de Serviço') badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                  else if (log.module === 'Checklists') badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                  else if (log.module === 'Fazendas') badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 border rounded-md text-[10px] font-bold ${badgeColor}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs truncate" title={log.item_description}>
                        {log.item_description}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={log.deleted_by}>
                            {log.deleted_by}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate text-[11px]" title={log.notes || '-'}>
                        {log.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CADASTRAR FAZENDA */}
      <Modal isOpen={isFarmOpen} onClose={() => setIsFarmOpen(false)} title="Cadastrar Nova Fazenda">
        <form onSubmit={handleCreateFarm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome da Fazenda</label>
            <input
              type="text"
              required
              placeholder="Ex: Fazenda Boa Sorte II"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Localização</label>
            <input
              type="text"
              required
              placeholder="Ex: Campo Novo do Parecis - MT"
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsFarmOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Gravar Fazenda
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR FAZENDA */}
      <Modal isOpen={isEditFarmOpen} onClose={() => setIsEditFarmOpen(false)} title="Editar Fazenda">
        <form onSubmit={handleUpdateFarm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome da Fazenda</label>
            <input
              type="text"
              required
              placeholder="Ex: Fazenda Boa Sorte"
              value={editFarmName}
              onChange={(e) => setEditFarmName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Localização</label>
            <input
              type="text"
              required
              placeholder="Ex: Campo Novo do Parecis - MT"
              value={editFarmLocation}
              onChange={(e) => setEditFarmLocation(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#1B3022]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditFarmOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B3022] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL REDEFINIR SENHA DO USUÁRIO */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          if (!resetLoading) {
            setIsResetPasswordOpen(false);
            setResetError('');
            setResetSuccess('');
          }
        }}
        title="Redefinir Senha do Usuário"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1B3022]/10 border border-[#1B3022]/20 flex items-center justify-center text-[#1B3022] shrink-0">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Usuário Alvo</p>
              <p className="text-xs font-bold text-slate-800">{resetTargetUser?.email}</p>
            </div>
          </div>

          {resetError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nova Senha *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Lock size={15} />
              </span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Lock size={15} />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1B3022] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResetPasswordOpen(false)}
              disabled={resetLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="px-4 py-2 bg-[#1B3022] hover:bg-[#2C4A34] text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              {resetLoading ? (
                <span>Atualizando no Supabase...</span>
              ) : (
                <>
                  <Key size={14} />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

