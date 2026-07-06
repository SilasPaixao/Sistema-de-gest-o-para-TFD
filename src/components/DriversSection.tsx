/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Phone, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { Driver, UserProfile } from '../types.js';

interface DriversSectionProps {
  currentUserId: string;
  userProfile: UserProfile;
}

export default function DriversSection({ currentUserId, userProfile }: DriversSectionProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');

  const isAuthorized = userProfile === 'Administrador' || userProfile === 'Coordenador';

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/drivers', {
        headers: { 'x-user-id': currentUserId }
      });
      if (!response.ok) {
        throw new Error('Falha ao obter lista de motoristas');
      }
      const data = await response.json();
      setDrivers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('Apenas Coordenadores ou Administradores cadastram motoristas.');
      return;
    }

    setError(null);
    setSuccess(null);

    if (!fullName.trim() || !contact.trim()) {
      setError('Nome completo e contato são obrigatórios.');
      return;
    }

    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          contact: contact.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao cadastrar motorista');
      }

      setSuccess('Motorista cadastrado com sucesso!');
      setFullName('');
      setContact('');

      fetchDrivers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-8" id="drivers-dashboard">
      <div className="border-b border-slate-200 pb-4">
        <h2 id="section-title-drivers" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Cadastro de Motoristas
        </h2>
        <p className="text-sm text-slate-500">
          Gerencie e registre os condutores habilitados para a realização das rotas de exames e cirurgias.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form panel */}
        <div className="lg:col-span-1">
          {isAuthorized ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Novo Motorista</h3>
              <p className="text-xs text-slate-500">Registre dados básicos de um motorista municipal.</p>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full name */}
                <div>
                  <label htmlFor="driver-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Completo do Motorista
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="driver-name"
                      type="text"
                      required
                      placeholder="Ex: Carlos Alberto Ramos"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <label htmlFor="driver-phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contato (Telefone/WhatsApp)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="driver-phone"
                      type="text"
                      required
                      placeholder="Ex: (75) 99999-1234"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <button
                  id="driver-submit"
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-105 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors pointer-elements-auto cursor-pointer"
                >
                  Cadastrar Motorista
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 space-y-2">
              <User className="h-8 w-8 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Edição Limitada</p>
              <p className="text-xs">Apenas Coordenadores e Administradores podem registrar novos motoristas.</p>
            </div>
          )}
        </div>

        {/* Listing Panel */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : drivers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-150">
              Nenhum motorista cadastrado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drivers.map((d) => (
                <div key={d.id} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-950 text-base">{d.fullName}</h4>
                    <div className="flex items-center text-slate-500 text-xs font-semibold space-x-1.5">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      <span>{d.contact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
