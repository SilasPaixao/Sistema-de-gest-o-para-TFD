/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Lock, FileText, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { User as UserType, UserProfile } from '../types.js';

interface LoginRegisterProps {
  onLoginSuccess: (user: UserType) => void;
}

export default function LoginRegister({ onLoginSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<UserProfile>('Usuário comum');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { username, password }
        : { username, password, name, profile };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro no servidor');
      }

      if (isLogin) {
        setSuccess('Login efetuado com sucesso!');
        // Allow time to show success animation
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        setSuccess(data.message || 'Cadastro realizado! Aguardando aprovação administrativa.');
        // Reset states and switch to login
        setUsername('');
        setPassword('');
        setName('');
        setProfile('Usuário comum');
        setTimeout(() => {
          setIsLogin(true);
          setSuccess(null);
        }, 4000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Decorative Badge */}
        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-150 text-blue-600 bg-blue-100 shadow-sm shadow-blue-150/40">
          <KeyRound className="h-7 w-7" />
        </div>
        <h2 id="portal-title" className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {isLogin ? 'Acessar TFD Municipal' : 'Solicitar Cadastro'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sistemas de Transporte para Tratamento Fora de Domicílio
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-10">
          


          {error && (
            <div id="login-error" className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-start space-x-2.5">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div id="login-success" className="mb-4 bg-blue-50 border border-blue-250/20 text-blue-800 rounded-xl p-4 text-sm flex items-start space-x-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-slate-700">
                  Nome Completo
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João da Silva"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-username" className="block text-sm font-medium text-slate-700">
                Nome de Usuário
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome do usuário"
                  autoComplete="username"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="reg-profile" className="block text-sm font-medium text-slate-700 mb-1">
                  Perfil de Usuário solicitado
                </label>
                <select
                  id="reg-profile"
                  value={profile}
                  onChange={(e) => setProfile(e.target.value as UserProfile)}
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm"
                >
                  <option value="Usuário comum">Usuário comum (Apenas Visualização)</option>
                  <option value="Coordenador">Coordenador (Gestão de Agendamentos e Viagens)</option>
                  <option value="Administrador">Administrador (Controle Total do Sistema)</option>
                </select>
              </div>
            )}

            <div>
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-200/50 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors pointer-elements-auto"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                ) : isLogin ? (
                  'Entrar no Sistema'
                ) : (
                  'Enviar Solicitação de Cadastro'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center border-t border-slate-150 pt-4 text-sm">
            <button
              id="switch-auth-mode"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              className="text-blue-600 font-semibold hover:text-blue-700 focus:outline-none"
            >
              {isLogin ? 'Não tem uma conta? Solicite cadastro aqui' : 'Já possui cadastro? Acesse o portal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
