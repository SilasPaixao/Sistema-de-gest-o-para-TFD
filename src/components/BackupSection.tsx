/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, FolderOpen, Save, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, History } from 'lucide-react';
import { User as UserType } from '../types.js';

interface BackupSectionProps {
  currentUser: UserType;
  backupDoneToday: boolean;
  onBackupExecuted: () => void; // Triggered on success to let navbar warning disappear
}

export interface BackupStatus {
  doneToday: boolean;
  lastBackupDate: string;
  backupFolder: string;
}

export default function BackupSection({ currentUser, backupDoneToday, onBackupExecuted }: BackupSectionProps) {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Settings Form
  const [folder, setFolder] = useState('backups');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = currentUser.profile === 'Administrador';

  const fetchBackupStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/backup/status', {
        headers: { 'x-user-id': currentUser.token || currentUser.id }
      });
      if (!response.ok) {
        throw new Error('Falha ao sincronizar status de backup.');
      }
      const data = await response.json();
      setStatus(data);
      setFolder(data.backupFolder || 'backups');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupStatus();
  }, [currentUser.id, backupDoneToday]);

  const handleRunBackup = async () => {
    setBackupLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/backup/run', {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.token || currentUser.id
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar as rotinas de backup');
      }

      setSuccess(`Backup executado com sucesso! Arquivo gerado: ${data.file}`);
      onBackupExecuted(); // Refresh parent status (will hide banner)
      fetchBackupStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaveLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/backup/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.token || currentUser.id
        },
        body: JSON.stringify({ backupFolder: folder })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações de backup');
      }

      setSuccess('Diretório de salvamento de backups atualizado com sucesso!');
      fetchBackupStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="backup-dashboard">
      <div className="border-b border-slate-200 pb-4">
        <h2 id="section-title-backups" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-600" />
          Utilitários de Backup do Banco de Dados
        </h2>
        <p className="text-sm text-slate-500">
          Configure a pasta de salvamento local e execute backups manuais das tabelas do sistema.
        </p>
      </div>

      {error && (
        <div id="backup-error" className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="backup-success" className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Execute actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl flex items-center justify-center ${backupDoneToday ? 'bg-blue-50 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
              <ShieldAlert className="h-5 w-5 animate-none" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Backup Manual Diário</h3>
              <p className="text-xs text-slate-500">Garanta a integridade operacional e exporte os dados.</p>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 font-medium text-xs text-slate-700 leading-relaxed">
            <p className="flex justify-between border-b border-slate-200/50 pb-2.5">
              <span>Status do Backup de Hoje:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                backupDoneToday 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-amber-100 text-amber-800 animate-pulse'
              }`}>
                {backupDoneToday ? 'REALIZADO HOJE' : 'PENDENTE DE EXECUÇÃO'}
              </span>
            </p>
            <p className="flex justify-between border-b border-slate-200/50 pb-2.5">
              <span>Último backup em:</span>
              <strong className="text-slate-900">{status?.lastBackupDate ? status?.lastBackupDate.split('-').reverse().join('/') : 'Nunca realizado'}</strong>
            </p>
            <p className="flex justify-between pb-1">
              <span>Pasta de Destino Definida:</span>
              <strong className="text-slate-900 font-mono">/{status?.backupFolder || 'backups'}</strong>
            </p>
          </div>

          <button
            id="execute-backup-btn"
            onClick={handleRunBackup}
            disabled={backupLoading}
            className="w-full flex items-center justify-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-200/50 transition-colors pointer-elements-autodisabled:opacity-50 cursor-pointer"
          >
            {backupLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Executar Backup Agora
          </button>
        </div>

        {/* Right Settings panel (Administrators only can edit, ordinary coordinate can only view) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center">
              <FolderOpen className="h-5 w-5 text-blue-600 mr-2 animate-none" />
              Diretório de Salvamento
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Defina o caminho de pasta do servidor onde serão compactados e arquivados os dumps diários em formato <code>.json</code>.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
              <div>
                <label htmlFor="settings-folder" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Caminho do Diretório (Pasta Local)
                </label>
                <input
                  id="settings-folder"
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Ex: backups/diarios"
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60"
                />
              </div>

              {isAdmin ? (
                <button
                  id="save-backup-settings-btn"
                  type="submit"
                  disabled={saveLoading}
                  className="w-full flex items-center justify-center py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors pointer-elements-auto disabled:opacity-50"
                >
                  {saveLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Atualizar Pasta de Backups
                </button>
              ) : (
                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 rounded-lg p-2.5 flex items-start">
                  <AlertCircle className="h-4 w-4 text-amber-500 mr-1.5 shrink-0" />
                  Visualização Somente. Apenas administradores do sistema podem mudar a pasta física de backups do servidor.
                </p>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
