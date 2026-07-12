/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, Save, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
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
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      setSuccess(`Backup executado com sucesso! O arquivo foi gerado e o download iniciará automaticamente.`);
      
      // Auto download to user's machine
      if (data.data) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.file || `backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      onBackupExecuted(); // Refresh parent status (will hide banner)
      fetchBackupStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBackupLoading(false);
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
          Execute backups manuais das tabelas do sistema. Os dados salvos são transferidos para a sua máquina.
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

      <div className="max-w-2xl mx-auto">
        
        {/* Execute actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl flex items-center justify-center ${backupDoneToday ? 'bg-blue-50 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
              <ShieldAlert className="h-5 w-5 animate-none" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Backup Manual Diário</h3>
              <p className="text-xs text-slate-500">Garanta a integridade operacional e exporte os dados diretamente para o seu computador.</p>
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
            <p className="flex justify-between pb-1">
              <span>Último backup em:</span>
              <strong className="text-slate-900">{status?.lastBackupDate ? status?.lastBackupDate.split('-').reverse().join('/') : 'Nunca realizado'}</strong>
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

      </div>
    </div>
  );
}
