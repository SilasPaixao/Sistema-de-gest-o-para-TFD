/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, User, Truck, Landmark, ClipboardList, ShieldAlert, BadgeInfo, CheckCircle, FileText, AlertTriangle, Plus, Edit, CornerDownLeft, Eye, ShieldCheck, Clock, AlertCircle, Printer, X, ExternalLink } from 'lucide-react';
import { Schedule, Vehicle, Hospital, RequestMedicalType, User as UserType, HistoryLog } from '../types.js';
import { normalizeText } from '../lib/normalize.js';

interface SchedulesSectionProps {
  currentUser: UserType;
  onOpenHospitals: () => void; // call callback to redirect to hopitals tab if user clicks "adicionar hospital"
}

export default function SchedulesSection({ currentUser, onOpenHospitals }: SchedulesSectionProps) {
  // Global States
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [requestType, setRequestType] = useState<RequestMedicalType>('Consulta/Exame');
  const [recurrentTypeDetails, setRecurrentTypeDetails] = useState('Quimioterapia');

  // Edit State
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Conclude State
  const [concludingScheduleId, setConcludingScheduleId] = useState<string | null>(null);

  // Global occupancy status for a selected single date (to trigger the fully booked vehicles notice banner)
  const [busyDatesWarning, setBusyDatesWarning] = useState<string | null>(null);

  // Filter & Search states for the travels table
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  const isUserOnly = currentUser.profile === 'Usuário comum';

  const handlePrint = () => {
    // Check if running inside an iframe (like AI Studio preview sandboxed frame)
    if (window.self !== window.top) {
      setShowPrintWarning(true);
    } else {
      window.print();
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch vehicles, hospitals, active schedules, and history in parallel
      const headers = { 'x-user-id': currentUser.token || currentUser.id };
      const [resVeh, resHosp, resSched, resHist] = await Promise.all([
        fetch('/api/vehicles', { headers }),
        fetch('/api/hospitals', { headers }),
        fetch('/api/schedules', { headers }),
        fetch('/api/schedules/history', { headers })
      ]);

      if (!resVeh.ok || !resHosp.ok || !resSched.ok || !resHist.ok) {
        throw new Error('Falha ao obter dados operacionais do servidor.');
      }

      setVehicles(await resVeh.json());
      setHospitals(await resHosp.json());
      setSchedules(await resSched.json());
      setHistory(await resHist.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  // Real-time occupant statistics to notify user if ALL vehicles are booked for a certain date range
  useEffect(() => {
    if (!startDate) {
      setBusyDatesWarning(null);
      return;
    }

    const checkGlobalOccupancy = async () => {
      try {
        const response = await fetch(`/api/occupancy-check?date=${startDate}`, {
          headers: { 'x-user-id': currentUser.token || currentUser.id }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.allVehiclesFull) {
            setBusyDatesWarning(`Atenção: Não há nenhuma vaga de veículo disponível para o dia ${startDate.split('-').reverse().join('/')}! Todos os veículos cadastrados encontram-se lotados nesta data.`);
          } else {
            setBusyDatesWarning(null);
          }
        }
      } catch {
        setBusyDatesWarning(null);
      }
    };

    checkGlobalOccupancy();
  }, [startDate, currentUser.id]);

  // Hospital query normalization search
  const filteredHospitals = hospitals.filter((h) => {
    if (!hospitalSearch.trim()) return false;
    const normalizedQuery = normalizeText(hospitalSearch);
    const normalizedName = normalizeText(h.name);
    return normalizedName.includes(normalizedQuery);
  });

  const handleSelectHospital = (h: Hospital) => {
    setSelectedHospitalId(h.id);
    setHospitalSearch(h.name);
  };

  const handleFormReset = () => {
    setPatientName('');
    setStartDate('');
    setEndDate('');
    setVehicleId('');
    setHospitalSearch('');
    setSelectedHospitalId('');
    setRequestType('Consulta/Exame');
    setRecurrentTypeDetails('Quimioterapia');
    setEditingScheduleId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUserOnly) return;

    setError(null);
    setSuccess(null);

    if (!patientName.trim() || !startDate || !endDate || !vehicleId || !selectedHospitalId || !requestType) {
      setError('Por favor, preencha todos os campos obrigatórios do agendamento.');
      return;
    }

    try {
      const payload = {
        patientName: patientName.trim(),
        startDate,
        endDate,
        vehicleId,
        hospitalId: selectedHospitalId,
        requestType,
        recurrentTypeDetails: requestType === 'Procedimento especializado recorrente' ? recurrentTypeDetails : undefined
      };

      const url = editingScheduleId ? `/api/schedules/${editingScheduleId}` : '/api/schedules';
      const method = editingScheduleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.token || currentUser.id
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar agendamento');
      }

      setSuccess(editingScheduleId ? 'Agendamento atualizado com sucesso!' : 'Agendamento cadastrado com sucesso!');
      handleFormReset();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (s: Schedule) => {
    const hosp = hospitals.find(h => h.id === s.hospitalId);
    setEditingScheduleId(s.id);
    setPatientName(s.patientName);
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setVehicleId(s.vehicleId);
    setSelectedHospitalId(s.hospitalId);
    setHospitalSearch(hosp ? hosp.name : '');
    setRequestType(s.requestType);
    if (s.recurrentTypeDetails) {
      setRecurrentTypeDetails(s.recurrentTypeDetails);
    }
  };

  // Baixa (Concluir Viagem)
  const handleConclude = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await fetch(`/api/schedules/${id}/conclude`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.token || currentUser.id
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao concluir viagem');
      }
      setSuccess('Viagem arquivada e registrada no histórico da auditoria!');
      setConcludingScheduleId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      setConcludingScheduleId(null);
    }
  };

  const getVehicleName = (vId: string) => {
    const v = vehicles.find(item => item.id === vId);
    return v ? `${v.brand} ${v.model} (${v.plate})` : 'Desconhecido';
  };

  const getHospitalName = (hId: string) => {
    const h = hospitals.find(item => item.id === hId);
    return h ? h.name : 'Desconhecido';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8" id="schedules-dashboard">
      
      {/* Printable-only elegant header */}
      <div className="hidden print:block border-b-2 border-slate-950 pb-5 mb-8 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">Portal TFD — Relatório de Viagens</h1>
            <p className="text-sm text-slate-600 mt-1">Secretaria Municipal de Saúde — Setor de Transportes e Tratamento Fora do Domicílio</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-600">
            <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider mb-1">Tipo de Relatório:</span>
            <span className="font-extrabold text-base text-slate-900">{activeTab === 'ativos' ? 'Agendamentos Ativos' : 'Histórico de Viagens Concluídas'}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider mb-1">Emitido por:</span>
            <span className="font-extrabold text-base text-slate-900">@{currentUser.name} ({currentUser.profile})</span>
          </div>
        </div>
      </div>

      {/* 1. Occupancy & Fully Booked Vehicle Alert (Notice Banner) */}
      {busyDatesWarning && (
        <div id="full-occupancy-alert" className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-900 animate-fadeIn no-print">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold leading-relaxed">
            <span className="block font-bold text-sm text-amber-800 mb-0.5">ALERTA DE LOTAÇÃO MÁXIMA</span>
            {busyDatesWarning}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 pb-4 no-print">
        <h2 id="section-title-schedules" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
          Central de Agendamento de Viagens (TFD)
        </h2>
        <p className="text-sm text-slate-500">
          Pesquise hospitais de destino, controle e programe viagens de pacientes respeitando a capacidade máxima de assentos de cada transporte.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Scheduling form or edit form (for Admin / Coordinator) */}
        {!isUserOnly && (
          <div className="lg:col-span-1 no-print">
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingScheduleId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <p className="text-xs text-slate-500 pb-1">
                {editingScheduleId ? 'Edite os dados básicos e reagende a viagem.' : 'Agende uma nova viagem e paciente.'}
              </p>

              {error && (
                <div id="schedule-form-error" className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div id="schedule-form-success" className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Patient name */}
                <div>
                  <label htmlFor="sched-patient" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Completo do Paciente (Obrigatório)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="sched-patient"
                      type="text"
                      required
                      placeholder="Ex: Maria das Neves Pinheiro"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Date start */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sched-start" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Data de Ida
                    </label>
                    <input
                      id="sched-start"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="sched-end" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Data de Volta
                    </label>
                    <input
                      id="sched-end"
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>

                {/* Vehicle Selection dropdown */}
                <div>
                  <label htmlFor="sched-vehicle" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Veículo de Viagem
                  </label>
                  <select
                    id="sched-vehicle"
                    required
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="">Selecione o veículo...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} ({v.plate}) — Cap: {v.maxPassengers}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hospital Selection search box */}
                <div className="relative">
                  <label htmlFor="sched-hospital-search" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-0.5">
                    Hospital de Destino
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">Filtre digitando o nome do hospital ou clínica abaixo</p>
                  
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Landmark className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="sched-hospital-search"
                      type="text"
                      placeholder="Pesquisar hospital..."
                      value={hospitalSearch}
                      onChange={(e) => {
                        setHospitalSearch(e.target.value);
                        if (!e.target.value) {
                          setSelectedHospitalId('');
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Sugestion listing box */}
                  {filteredHospitals.length > 0 && !selectedHospitalId && (
                    <div id="hospital-search-suggestions" className="absolute z-10 w-full bg-white mt-1.5 border border-slate-150 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {filteredHospitals.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => handleSelectHospital(h)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-900 flex flex-col focus:outline-none focus:bg-slate-50"
                        >
                          <span className="font-semibold">{h.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{h.address}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* "Add Hospital to Database" custom callback notice */}
                  {hospitalSearch && filteredHospitals.length === 0 && !selectedHospitalId && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-xs text-red-700 font-semibold mb-1">Nenhum hospital encontrado com esse nome.</p>
                      <button
                        id="form-add-hospital-db-btn"
                        type="button"
                        onClick={onOpenHospitals}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-0.5 focus:outline-none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar hospital ao banco de dados</span>
                      </button>
                    </div>
                  )}

                  {selectedHospitalId && (
                    <p className="text-[10px] text-blue-600 font-bold flex items-center mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Destino Vinculado: {getHospitalName(selectedHospitalId)}
                    </p>
                  )}
                </div>

                {/* Request Medical Type */}
                <div>
                  <label htmlFor="sched-request-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Requisição Médica
                  </label>
                  <select
                    id="sched-request-type"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as RequestMedicalType)}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Consulta/Exame">Consulta/Exame</option>
                    <option value="Cirurgia">Cirurgia</option>
                    <option value="Procedimento especializado recorrente">Procedimento especializado recorrente</option>
                  </select>
                </div>

                {requestType === 'Procedimento especializado recorrente' && (
                  <div>
                    <label htmlFor="sched-recurrent-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Especificar Tratamento Recorrente
                    </label>
                    <select
                      id="sched-recurrent-type"
                      value={recurrentTypeDetails}
                      onChange={(e) => setRecurrentTypeDetails(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    >
                      <option value="Quimioterapia">Quimioterapia</option>
                      <option value="Hemodiálise">Hemodiálise</option>
                      <option value="Radioterapia">Radioterapia</option>
                      <option value="Outros">Outras Terapias</option>
                    </select>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    id="sched-submit-btn"
                    type="submit"
                    className="flex-1 flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-blue-100 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors pointer-elements-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingScheduleId ? 'Salvar Edição' : 'Agendar Viagem'}
                  </button>
                  {editingScheduleId && (
                    <button
                      id="sched-cancel-edit-btn"
                      type="button"
                      onClick={handleFormReset}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold bg-white rounded-xl text-sm hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Right side: Interactive Tab lists (Ativos vs Históricos de Auditorias) */}
        <div className={isUserOnly ? 'lg:col-span-3' : 'lg:col-span-2'}>
          
          {/* Section tab buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 mb-6 font-sans gap-4 no-print">
            <div className="flex overflow-x-auto scrollbar-none">
              <button
                id="tab-schedules-active"
                onClick={() => setActiveTab('ativos')}
                className={`flex items-center space-x-2 border-b-2 py-3 px-6 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'ativos'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Truck className="h-4 w-4" />
                <span>Agendamentos Ativos ({schedules.length})</span>
              </button>
              <button
                id="tab-schedules-history"
                onClick={() => setActiveTab('historico')}
                className={`flex items-center space-x-2 border-b-2 py-3 px-6 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'historico'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Histórico de Viagens Concluídas ({history.length})</span>
              </button>
            </div>

            {/* Print trigger button */}
            <button
              id="print-schedules-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition-all focus:outline-none shrink-0 cursor-pointer pointer-elements-auto"
              title="Abre as opções de impressão do sistema"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Imprimir Lista</span>
            </button>
          </div>

          {/* List specific error and success alert messages */}
          {error && (
            <div id="list-error-alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-start justify-between space-x-2 no-print">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 focus:outline-none cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div id="list-success-alert" className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs flex items-start justify-between space-x-2 no-print">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                <span>{success}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="text-blue-400 hover:text-blue-600 focus:outline-none cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'ativos' ? (
            schedules.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-150 text-center text-slate-400 text-sm">
                Nenhum agendamento ativo cadastrado.
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((s) => {
                  const isCreator = s.createdByUserId === currentUser.id;
                  const isAdmin = currentUser.profile === 'Administrador';
                  const canEdit = isCreator || isAdmin;
                  const isPastReturn = s.endDate <= todayStr;

                  return (
                    <div 
                      key={s.id} 
                      className={`bg-white p-6 rounded-2xl border transition-all duration-200 ${
                        isPastReturn 
                          ? 'border-amber-200 shadow-sm shadow-amber-50 bg-amber-50/10' 
                          : 'border-slate-150 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Past Return Date - Notification Warning Banner */}
                      {isPastReturn && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-pulse">
                          <div className="flex items-center space-x-2">
                             <Clock className="h-4 w-4 text-amber-600" />
                            <span className="font-bold">Retorno já alcançado ({s.endDate.split('-').reverse().join('/')}). Favor realizar a baixa!</span>
                          </div>
                          {canEdit && (
                            <button
                              id={`baixa-btn-${s.id}`}
                              onClick={() => setConcludingScheduleId(s.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xxs tracking-wider uppercase shadow transition-all duration-200 pointer-elements-auto focus:outline-none"
                            >
                              Dar Baixa
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        
                        {/* Summary details */}
                        <div className="space-y-3">
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                              s.requestType === 'Cirurgia' ? 'bg-rose-100 text-rose-800 border border-rose-250/30' :
                              s.requestType === 'Consulta/Exame' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}>
                              {s.requestType === 'Procedimento especializado recorrente' ? `${s.requestType} (${s.recurrentTypeDetails})` : s.requestType}
                            </span>
                            <h4 className="font-extrabold text-slate-950 text-base">{s.patientName}</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-xs text-slate-600">
                            <div className="flex items-center space-x-2 font-medium">
                              <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                              <span>De: <strong>{s.startDate.split('-').reverse().join('/')}</strong> Até: <strong>{s.endDate.split('-').reverse().join('/')}</strong></span>
                            </div>
                            <div className="flex items-center space-x-2 font-medium">
                              <Truck className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="truncate">Transporte: {getVehicleName(s.vehicleId)}</span>
                            </div>
                            <div className="flex items-center space-x-2 font-medium col-span-1 md:col-span-2">
                              <Landmark className="h-4 w-4 text-blue-500 shrink-0" />
                              <span>Destino: {getHospitalName(s.hospitalId)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions options */}
                        <div className="flex items-center space-x-2 shrink-0 self-end md:self-start no-print">
                          {canEdit ? (
                            <>
                              <button
                                id={`edit-sched-btn-${s.id}`}
                                onClick={() => startEdit(s)}
                                className="p-2 text-slate-500 bg-slate-50 border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 rounded-xl transition-all duration-205 focus:outline-none"
                                title="Editar agendamento"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              
                              {/* Standard manual low baja button (also if dates are not past due) */}
                              <button
                                id={`manual-baixa-btn-${s.id}`}
                                onClick={() => setConcludingScheduleId(s.id)}
                                className="flex items-center px-3 py-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-semibold focus:outline-none"
                                title="Concluir viagem e arquivar"
                              >
                                <CornerDownLeft className="h-3.5 w-3.5 mr-1" />
                                Concluir
                              </button>
                            </>
                          ) : (
                            <span className="text-xxs font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-lg flex items-center">
                              <Eye className="h-3 w-3 mr-1" /> Somente Visualização
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Footer audit creator detail trail */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-slate-400 font-mono">
                        <p>Responsável pelo Agendamento: <span className="font-semibold text-slate-700">@{s.createdByUserName}</span></p>
                        <p>Registrado em: {new Date(s.createdAt).toLocaleDateString('pt-BR')} às {new Date(s.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>

                    </div>
                  );
                })}
              </div>
            )
          ) : (
            history.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-150 text-center text-slate-400 text-sm">
                Nenhum histórico de viagens concluídas arquivadas.
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                          <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
                          Viagem Concluída & Auditada (Baixa Realizada)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {h.id}</span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-800 text-base mb-2.5">{h.patientName}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                        <p>Ida/Volta: <strong className="text-slate-800">{h.startDate.split('-').reverse().join('/')} até {h.endDate.split('-').reverse().join('/')}</strong></p>
                        <p>Transporte Utilizado: <strong className="text-slate-800">{h.vehicleDetails}</strong></p>
                        <p className="col-span-1 md:col-span-2">Hospital de Tratamento: <strong className="text-slate-800">{h.hospitalName}</strong></p>
                        <p>Tipo: <span className="font-medium">{h.requestType}</span></p>
                        <p>Criado originalmente por: <span className="font-medium text-slate-755">{h.createdByUserName}</span></p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between text-[10px] text-slate-400 font-mono">
                      <p>Baixa Efetuada por: <strong className="text-slate-600">{h.completedByUserName}</strong></p>
                      <p>Conclusão finalizada em: {new Date(h.completedAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>

      {/* Printable-only footer signature area */}
      <div className="hidden print:block mt-12 pt-8 border-t border-dashed border-slate-350 text-xs text-slate-500">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div className="space-y-12">
            <div className="border-b border-slate-400 mx-auto w-4/5 h-6"></div>
            <p className="font-semibold uppercase text-[10px] tracking-wider text-slate-700">Assinatura do Motorista / Transportador</p>
          </div>
          <div className="space-y-12">
            <div className="border-b border-slate-400 mx-auto w-4/5 h-6"></div>
            <p className="font-semibold uppercase text-[10px] tracking-wider text-slate-700">Visto do Setor de TFD Municipal</p>
          </div>
        </div>
        <p className="text-[10px] text-center mt-12 text-slate-400 font-mono">Documento emitido eletronicamente através do Portal de Gestão TFD.</p>
      </div>

      {/* Smart Print Warning Modal for sandboxed Iframe environments */}
      {showPrintWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Printer className="h-5 w-5 animate-none" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Opções de Impressão</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintWarning(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs leading-relaxed flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  O navegador bloqueia telas de impressão quando o aplicativo está rodando dentro do painel integrado da plataforma de desenvolvimento.
                </span>
              </div>

              <div className="text-slate-600 text-xs space-y-2.5 leading-relaxed">
                <p className="font-semibold text-slate-800">Para obter uma via impressa perfeitamente formatada em tamanho A4:</p>
                <ol className="list-decimal pl-5 space-y-1.5 font-medium text-slate-755">
                  <li>
                    Clique no botão de compartilhamento ou em <strong className="text-slate-900">"Abrir em nova aba"</strong> no topo superior direito da tela;
                  </li>
                  <li>
                    Na nova aba que se abrirá, clique no botão <strong className="text-blue-600">"Imprimir Lista"</strong> ou use o atalho <kbd className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800 text-[10px]">Ctrl + P</kbd>;
                  </li>
                  <li>
                    A janela oficial de impressão irá se abrir perfeitamente configurada sem elementos de navegação web.
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPrintWarning(false)}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-105 transition-colors cursor-pointer text-center focus:outline-none"
              >
                Entendi, fechar aviso
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintWarning(false);
                  try {
                    window.print();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="py-2.5 px-3 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer focus:outline-none"
                title="Tentar acionar o comando padrão mesmo assim"
              >
                Tentar imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for "Dar Baixa / Concluir" */}
      {concludingScheduleId && (() => {
        const s = schedules.find(item => item.id === concludingScheduleId);
        if (!s) return null;
        const isPastReturn = s.endDate <= todayStr;

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-left">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Confirmar Baixa de Viagem</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConcludingScheduleId(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Você está prestes a concluir e arquivar esta viagem. O registro sairá da lista de agendamentos ativos e passará a integrar o histórico de viagens concluídas para fins de auditoria.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs space-y-2 text-slate-800">
                  <p><strong>Paciente:</strong> {s.patientName}</p>
                  <p><strong>Tipo:</strong> {s.requestType === 'Procedimento especializado recorrente' ? `${s.requestType} (${s.recurrentTypeDetails})` : s.requestType}</p>
                  <p><strong>Destino:</strong> {getHospitalName(s.hospitalId)}</p>
                  <p><strong>Período:</strong> {s.startDate.split('-').reverse().join('/')} até {s.endDate.split('-').reverse().join('/')}</p>
                  <p><strong>Veículo:</strong> {getVehicleName(s.vehicleId)}</p>
                </div>

                {!isPastReturn && (
                  <div className="p-3 bg-amber-50 border border-amber-250 text-amber-900 rounded-xl text-xs leading-relaxed flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Aviso de Baixa Antecipada</span>
                      A data de retorno definida para esta viagem é <strong>{s.endDate.split('-').reverse().join('/')}</strong>, que ainda não foi alcançada.
                      <p className="mt-1 font-semibold text-amber-850">Por regras operacionais do setor de TFD, a viagem só deve ser dada baixa e arquivada após o retorno efetivo do paciente.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConcludingScheduleId(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConclude(s.id)}
                  disabled={!isPastReturn}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all text-center focus:outline-none ${
                    isPastReturn 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 hover:shadow-lg cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                  }`}
                  title={!isPastReturn ? 'A baixa só é permitida após a data de retorno.' : 'Confirmar e arquivar viagem'}
                >
                  Confirmar Baixa
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
