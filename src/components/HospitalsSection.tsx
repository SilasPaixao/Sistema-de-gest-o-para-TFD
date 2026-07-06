/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Landmark, MapPin, Phone, Plus, Minus, ArrowUpRight, Upload, HelpCircle, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { Hospital, UserProfile } from '../types.js';

interface HospitalsSectionProps {
  currentUserId: string;
  userProfile: UserProfile;
}

export default function HospitalsSection({ currentUserId, userProfile }: HospitalsSectionProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [contacts, setContacts] = useState<string[]>(['']); // starts with one contact field

  // Drag & drop state for file upload
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/hospitals', {
        headers: { 'x-user-id': currentUserId }
      });
      if (!response.ok) {
        throw new Error('Falha ao obter lista de hospitais');
      }
      const data = await response.json();
      setHospitals(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [currentUserId]);

  // Handle contact list inputs (up to 10 contacts)
  const handleContactChange = (index: number, val: string) => {
    const updated = [...contacts];
    updated[index] = val;
    setContacts(updated);
  };

  const addContactField = () => {
    if (contacts.length >= 10) return;
    setContacts([...contacts, '']);
  };

  const removeContactField = (index: number) => {
    if (contacts.length <= 1) return;
    const updated = contacts.filter((_, idx) => idx !== index);
    setContacts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !address.trim()) {
      setError('Nome do hospital e endereço são obrigatórios.');
      return;
    }

    // Filter out blank contact slots
    const validContacts = contacts.map(c => c.trim()).filter(Boolean);

    try {
      const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          contacts: validContacts
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar hospital');
      }

      setSuccess('Hospital cadastrado com sucesso!');
      setName('');
      setAddress('');
      setGoogleMapsUrl('');
      setContacts(['']); // Reset contact fields

      fetchHospitals();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Drag & Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processJsonFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processJsonFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processJsonFile = (file: File) => {
    setError(null);
    setSuccess(null);

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Por favor, faça upload de um arquivo com extensão .json válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const response = await fetch('/api/hospitals/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUserId
          },
          body: JSON.stringify(parsed)
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || 'Falha na importação de hospitais');
        }

        setSuccess(resData.message || 'Hospitais importados com sucesso!');
        fetchHospitals();
      } catch (err: any) {
        setError(`Erro ao importar hospitais: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setError('Não foi possível ler o arquivo enviado.');
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-8" id="hospitals-dashboard">
      <div className="border-b border-slate-200 pb-4">
        <h2 id="section-title-hospitals" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <Landmark className="h-5 w-5 mr-2 text-blue-600" />
          Cadastro e Importação de Hospitais
        </h2>
        <p className="text-sm text-slate-500">
          Cadastre os hospitais parceiros de destino para tratamento. Permite inserção manual ou importação rápida via JSON.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Manual Form & Import Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Novo Hospital</h3>
            <p className="text-xs text-slate-500 pb-2">Preencha os dados do local de tratamento.</p>

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
              {/* Name */}
              <div>
                <label htmlFor="hosp-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Hospital / Clínica
                </label>
                <input
                  id="hosp-name"
                  type="text"
                  required
                  placeholder="Ex: Santa Casa de Misericórdia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Address */}
              <div>
                <label htmlFor="hosp-address" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Endereço / Localidade
                </label>
                <input
                  id="hosp-address"
                  type="text"
                  required
                  placeholder="Ex: Av. Dom João VI, 250 - Brotas"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Google Maps link */}
              <div>
                <label htmlFor="hosp-maps" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Link de Localização Google Maps <span className="font-normal text-slate-400 text-[10px]">(Opcional)</span>
                </label>
                <input
                  id="hosp-maps"
                  type="url"
                  placeholder="Ex: https://maps.google.com/?q=..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Dynamic contacts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contatos do Hospital ({contacts.length}/10)
                  </label>
                  {contacts.length < 10 && (
                    <button
                      id="add-contact-btn"
                      type="button"
                      onClick={addContactField}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-0.5 focus:outline-none"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {contacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <div className="relative rounded-md shadow-sm flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <input
                          id={`hosp-contact-${idx}`}
                          type="text"
                          placeholder="Ex: (71) 3203-1200"
                          value={contact}
                          onChange={(e) => handleContactChange(idx, e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        />
                      </div>
                      {contacts.length > 1 && (
                        <button
                          id={`remove-contact-${idx}`}
                          type="button"
                          onClick={() => removeContactField(idx)}
                          className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 rounded-xl focus:outline-none transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                id="hospital-submit-btn"
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-105 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors pointer-elements-auto cursor-pointer"
              >
                Cadastrar Hospital
              </button>
            </form>
          </div>

          {/* Import JSON area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center">
              <Upload className="h-4 w-4 text-blue-600 mr-1.5" />
              Importação Rápidas (.json)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Arraste e solte o JSON de hospitais ou clique para fazer upload. O arquivo deve conter os atributos <code>nomeHospital</code>, <code>endereco</code> e <code>contatos</code> (com até 10 números).
            </p>

            {/* Drag & Drop Zone */}
            <div
              id="drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-inner scale-98'
                  : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50/50'
              }`}
            >
              <input
                id="file-selector-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <Upload className={`h-8 w-8 mx-auto mb-2 transition-transform duration-200 ${dragActive ? 'scale-110 text-blue-600' : 'text-slate-400'}`} />
              <p className="text-xs font-semibold text-slate-700">Arrastar & Soltar arquivo JSON</p>
              <p className="text-[10px] text-slate-400 mt-1">Ou clique para navegar em seus arquivos</p>
            </div>
          </div>
        </div>

        {/* Right list: Registered hospitals list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-150">
              Nenhum hospital cadastrado. Registre manualmente ou faça importação por JSON.
            </div>
          ) : (
            <div className="space-y-4">
              {hospitals.map((h) => (
                <div key={h.id} className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-950 text-base">{h.name}</h4>
                      
                      <div className="flex items-start text-xs text-slate-600 space-x-1.5">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>{h.address}</span>
                      </div>
                    </div>

                    {h.googleMapsUrl && (
                      <a
                        href={h.googleMapsUrl}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors shrink-0"
                      >
                        Ver no Google Maps
                        <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                      </a>
                    )}
                  </div>

                  {/* Contacts line badges style */}
                  {h.contacts && h.contacts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contatos de Emergência/Agendamentos</p>
                      <div className="flex flex-wrap gap-2">
                        {h.contacts.map((contact, idx) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200">
                            <Phone className="h-3 w-3 text-blue-500 mr-1.5" />
                            {contact}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
