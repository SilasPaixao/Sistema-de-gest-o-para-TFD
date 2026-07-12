/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Check, X, Users, MessageSquareCode, Clock, ShieldCheck, ShieldAlert, UserCheck, Trash2 } from 'lucide-react';
import { User as UserType } from '../types.js';
import ConfirmDialog from './ConfirmDialog.js';

interface AdminUsersProps {
  currentUserId: string;
}

export default function AdminUsers({ currentUserId }: AdminUsersProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users', {
        headers: {
          'x-user-id': currentUserId
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao buscar usuários');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUserId]);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`/api/users/${id}/approve`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUserId
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao aprovar usuário');
      }
      // Re-fetch users list on success
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Rejeitar Usuário',
      message: 'Tem certeza que deseja REJEITAR esta solicitação de usuário?',
      type: 'warning',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(id);
          const response = await fetch(`/api/users/${id}/reject`, {
            method: 'POST',
            headers: {
              'x-user-id': currentUserId
            }
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao rejeitar usuário');
          }
          await fetchUsers();
        } catch (err: any) {
          alert(err.message);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleDeleteUser = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Usuário',
      message: 'Tem certeza absoluta que deseja EXCLUIR permanentemente este usuário cadastrado?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(id);
          const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': currentUserId
            }
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao excluir usuário');
          }
          await fetchUsers();
        } catch (err: any) {
          alert(err.message);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const pendentes = users.filter(u => u.status === 'pendente');
  const aprovadosERejeitados = users.filter(u => u.status !== 'pendente');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="admin-users-dashboard">
      <div className="border-b border-slate-200 pb-4">
        <h2 id="section-title-users" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Área Administrativa → Gestão de Usuários
        </h2>
        <p className="text-sm text-slate-500">
          Gerencie o acesso dos funcionários da prefeitura ao sistema de Tratamento Fora de Domicílio.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 1. Solicitações Pendentes Section */}
      <div id="pending-users-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
            <h3 className="font-semibold text-slate-900">Solicitações Pendentes ({pendentes.length})</h3>
          </div>
          <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2.5 py-1 rounded-full">
            Aguardando Aprovação de Administrador
          </span>
        </div>

        {pendentes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma solicitação de cadastro pendente no momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendentes.map((u) => (
              <div key={u.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-slate-900 text-base">{u.name}</p>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      @{u.username}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    <p>Perfil Solicitado: 
                      <span className={`ml-1 px-2 py-0.5 rounded font-semibold ${
                        u.profile === 'Administrador' ? 'bg-red-50 text-red-700 border border-red-100' :
                        u.profile === 'Coordenador' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {u.profile}
                      </span>
                    </p>
                    <p>Cadastrado em: {new Date(u.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id={`approve-btn-${u.id}`}
                    onClick={() => handleApprove(u.id)}
                    disabled={actionLoading !== null}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-200/50 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Aprovar
                  </button>
                  <button
                    id={`reject-btn-${u.id}`}
                    onClick={() => handleReject(u.id)}
                    disabled={actionLoading !== null}
                    className="flex items-center px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-slate-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Todos os Usuários Cadastrados */}
      <div id="registered-users-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 animate-none">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Usuários Cadastrados / Histórico de Decisões</h3>
          </div>
        </div>

        {aprovadosERejeitados.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhum usuário cadastrado além de você.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left font-semibold">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Nome de Usuário</th>
                  <th className="px-6 py-3">Perfil</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Cadastrado em</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {aprovadosERejeitados.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">@{u.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                        u.profile === 'Administrador' ? 'bg-red-50 text-red-700 border border-red-100' :
                        u.profile === 'Coordenador' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {u.profile}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium space-x-1 ${
                        u.status === 'aprovado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'aprovado' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{u.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.username !== 'admin' && u.id !== currentUserId && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actionLoading !== null}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
}
