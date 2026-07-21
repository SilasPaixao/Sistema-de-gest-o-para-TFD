import React, { useState, useEffect } from 'react';
import { ClipboardList, LogOut, Truck, Clock, MapPin, Compass, CheckSquare, PlusCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { User, Vehicle, VehicleChecklist } from '../types.js';

interface DriverChecklistSectionProps {
  currentUser: User;
  onLogout: () => void;
}

export default function DriverChecklistSection({ currentUser, onLogout }: DriverChecklistSectionProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [initialKm, setInitialKm] = useState('');
  const [finalKm, setFinalKm] = useState('');

  // Checklist items (true = OK, false = NOT OK)
  const [oleo, setOleo] = useState(true);
  const [agua, setAgua] = useState(true);
  const [oxigenio, setOxigenio] = useState(true);
  const [parabrisa, setParabrisa] = useState(true);
  const [luzRe, setLuzRe] = useState(true);
  const [arCondicionado, setArCondicionado] = useState(true);
  const [documento, setDocumento] = useState(true);
  const [piscas, setPiscas] = useState(true);
  const [retrovisores, setRetrovisores] = useState(true);
  const [sirene, setSirene] = useState(true);
  const [marcadorCombustivel, setMarcadorCombustivel] = useState(true);
  const [chaveRodas, setChaveRodas] = useState(true);
  const [macaco, setMacaco] = useState(true);
  const [buzina, setBuzina] = useState(true);
  const [farois, setFarois] = useState(true);

  // Saída da base
  const [saidaHorario, setSaidaHorario] = useState('');
  const [saidaDestino, setSaidaDestino] = useState('');
  const [saidaCidade, setSaidaCidade] = useState('');

  const currentUserId = currentUser.token || currentUser.id;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load vehicles
      const vRes = await fetch('/api/vehicles', {
        headers: { 'x-user-id': currentUserId }
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData);
        if (vData.length > 0) {
          setSelectedVehicleId(vData[0].id);
        }
      }

      // Load checklists
      const cRes = await fetch('/api/checklists', {
        headers: { 'x-user-id': currentUserId }
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        // Drivers only see their own checklists
        const filtered = cData.filter((chk: VehicleChecklist) => chk.driverUserId === currentUser.id);
        setChecklists(filtered.sort((a: VehicleChecklist, b: VehicleChecklist) => b.createdAt.localeCompare(a.createdAt)));
      }
    } catch (e: any) {
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedVehicleId) {
      setError('Por favor, selecione um veículo.');
      return;
    }
    if (!initialKm || !finalKm) {
      setError('Por favor, preencha os campos de KM inicial e KM final.');
      return;
    }
    if (Number(finalKm) < Number(initialKm)) {
      setError('A quilometragem final não pode ser menor que a quilometragem inicial.');
      return;
    }
    if (!saidaHorario || !saidaDestino || !saidaCidade) {
      setError('Por favor, preencha todos os dados de saída da base.');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const vehicleLabel = selectedVehicle ? `${selectedVehicle.model} (${selectedVehicle.plate})` : 'Ambulância';

    const checklistData = {
      vehicleId: selectedVehicleId,
      vehicleModelPlate: vehicleLabel,
      date,
      initialKm: Number(initialKm),
      finalKm: Number(finalKm),
      oleo,
      agua,
      oxigenio,
      parabrisa,
      luzRe,
      arCondicionado,
      documento,
      piscas,
      retrovisores,
      sirene,
      marcadorCombustivel,
      chaveRodas,
      macaco,
      buzina,
      farois,
      saidaHorario,
      saidaDestino,
      saidaCidade
    };

    try {
      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify(checklistData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao salvar o checklist');
      }

      setSuccess('Checklist de veículo enviado com sucesso!');
      
      // Reset checklist non-static fields
      setInitialKm('');
      setFinalKm('');
      setSaidaHorario('');
      setSaidaDestino('');
      setSaidaCidade('');

      // Reload lists
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggle = (item: string, value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(!value);
  };

  const renderToggleItem = (label: string, value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    return (
      <button
        type="button"
        onClick={() => handleToggle(label, value, setter)}
        className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all font-semibold text-xs ${
          value 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm shadow-emerald-50' 
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}
      >
        <span className="uppercase tracking-wide">{label}</span>
        <span className="text-base select-none">
          {value ? '🆗 OK' : '❌ PENDENTE'}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* Top Banner specific for Drivers */}
      <header className="bg-white border-b border-slate-150 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Painel do Motorista</h1>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Secretaria de Saúde</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-medium">Motorista Credenciado</p>
            </div>
            <button
              id="driver-logout-btn"
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-semibold transition-all focus:outline-none"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Welcome and Information Card */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 rounded-3xl shadow-xl shadow-emerald-900/10 mb-6">
          <h2 className="text-lg font-extrabold tracking-tight">Olá, {currentUser.name}!</h2>
          <p className="text-emerald-100 text-xs mt-1 leading-relaxed">
            Antes de iniciar qualquer viagem, você deve realizar o checklist de segurança do seu veículo. 
            Preencha todos os parâmetros atentamente e certifique-se da integridade das informações abaixo.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-start space-x-2 text-xs font-semibold">
            <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-start space-x-2 text-xs font-semibold shadow-sm">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Checklist Entry Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-6">
              
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1 mb-4 pb-2 border-b border-slate-100">
                  <Truck className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Informações Gerais do Veículo</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="chk-vehicle" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Selecione o Veículo / Ambulância
                    </label>
                    <select
                      id="chk-vehicle"
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    >
                      <option value="">-- Selecione o veículo --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.model} ({v.plate})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="chk-date" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Data do Agendamento / Viagem
                    </label>
                    <input
                      id="chk-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-initial-km" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      KM Inicial
                    </label>
                    <input
                      id="chk-initial-km"
                      type="number"
                      placeholder="Ex: 63136"
                      value={initialKm}
                      onChange={(e) => setInitialKm(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-final-km" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      KM Final
                    </label>
                    <input
                      id="chk-final-km"
                      type="number"
                      placeholder="Ex: 63565"
                      value={finalKm}
                      onChange={(e) => setFinalKm(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Parametros do checklist */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1 mb-4 pb-2 border-b border-slate-100">
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Parâmetros de Verificação (Toque para alternar)</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderToggleItem('Óleo', oleo, setOleo)}
                  {renderToggleItem('Água', agua, setAgua)}
                  {renderToggleItem('Oxigênio', oxigenio, setOxigenio)}
                  {renderToggleItem('Para-brisa', parabrisa, setParabrisa)}
                  {renderToggleItem('Luz de ré', luzRe, setLuzRe)}
                  {renderToggleItem('Ar-condicionado', arCondicionado, setArCondicionado)}
                  {renderToggleItem('Documento', documento, setDocumento)}
                  {renderToggleItem('Piscas', piscas, setPiscas)}
                  {renderToggleItem('Retrovisores', retrovisores, setRetrovisores)}
                  {renderToggleItem('Sirene', sirene, setSirene)}
                  {renderToggleItem('Marcador Combustível', marcadorCombustivel, setMarcadorCombustivel)}
                  {renderToggleItem('Chave de rodas', chaveRodas, setChaveRodas)}
                  {renderToggleItem('Macaco', macaco, setMacaco)}
                  {renderToggleItem('Buzina', buzina, setBuzina)}
                  {renderToggleItem('Faróis', farois, setFarois)}
                </div>
              </div>

              {/* Saída da base */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1 mb-4 pb-2 border-b border-slate-100">
                  <Compass className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Saída da Base</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="chk-horario" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Horário de Saída
                    </label>
                    <input
                      id="chk-horario"
                      type="text"
                      placeholder="Ex: 04:00"
                      value={saidaHorario}
                      onChange={(e) => setSaidaHorario(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-destino" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Destino / Hospital
                    </label>
                    <input
                      id="chk-destino"
                      type="text"
                      placeholder="Ex: H.A.M"
                      value={saidaDestino}
                      onChange={(e) => setSaidaDestino(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-cidade" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Cidade de Destino
                    </label>
                    <input
                      id="chk-cidade"
                      type="text"
                      placeholder="Ex: SALVADOR"
                      value={saidaCidade}
                      onChange={(e) => setSaidaCidade(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Conductor Signature block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nome do condutor logado</p>
                <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>* {currentUser.name} *</span>
                </p>
              </div>

              <div>
                <button
                  id="submit-checklist-btn"
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-emerald-100 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer pointer-events-auto"
                >
                  Salvar e Enviar Checklist
                </button>
              </div>

            </form>
          </div>

          {/* Side Panel: Driver's Checklist Log History */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-1">
                <ClipboardList className="h-4.5 w-4.5 text-emerald-600" />
                <span>Seus Envios</span>
              </h3>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Carregando histórico...</div>
              ) : checklists.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  Nenhum checklist enviado por você até o momento.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {checklists.map(chk => {
                    const isExpanded = expandedChecklistId === chk.id;
                    const formattedDate = chk.date.split('-').reverse().join('/');
                    return (
                      <div key={chk.id} className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpandedChecklistId(isExpanded ? null : chk.id)}>
                          <div>
                            <p className="text-xxs font-extrabold text-emerald-700 tracking-wider uppercase mb-0.5">{formattedDate}</p>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{chk.vehicleModelPlate}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{chk.saidaHorario} | {chk.saidaDestino} ({chk.saidaCidade})</p>
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 p-0.5" type="button">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] space-y-2 text-slate-600 animate-fadeIn">
                            <div className="grid grid-cols-2 gap-y-1">
                              <div><strong className="text-slate-700">KM Inicial:</strong> {chk.initialKm}</div>
                              <div><strong className="text-slate-700">KM Final:</strong> {chk.finalKm}</div>
                              <div><strong className="text-slate-700">Horário:</strong> {chk.saidaHorario}</div>
                              <div><strong className="text-slate-700">Destino:</strong> {chk.saidaDestino}</div>
                              <div><strong className="text-slate-700">Cidade:</strong> {chk.saidaCidade}</div>
                            </div>
                            
                            <div className="pt-2">
                              <strong className="text-slate-700 block mb-1">Itens Verificados:</strong>
                              <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold text-slate-500">
                                <div>Óleo: {chk.oleo ? '🆗' : '❌'}</div>
                                <div>Água: {chk.agua ? '🆗' : '❌'}</div>
                                <div>Oxigênio: {chk.oxigenio ? '🆗' : '❌'}</div>
                                <div>Para-brisa: {chk.parabrisa ? '🆗' : '❌'}</div>
                                <div>Luz de Ré: {chk.luzRe ? '🆗' : '❌'}</div>
                                <div>Ar Condic.: {chk.arCondicionado ? '🆗' : '❌'}</div>
                                <div>Documento: {chk.documento ? '🆗' : '❌'}</div>
                                <div>Piscas: {chk.piscas ? '🆗' : '❌'}</div>
                                <div>Retrovisores: {chk.retrovisores ? '🆗' : '❌'}</div>
                                <div>Sirene: {chk.sirene ? '🆗' : '❌'}</div>
                                <div>Combustível: {chk.marcadorCombustivel ? '🆗' : '❌'}</div>
                                <div>Chave Rodas: {chk.chaveRodas ? '🆗' : '❌'}</div>
                                <div>Macaco: {chk.macaco ? '🆗' : '❌'}</div>
                                <div>Buzina: {chk.buzina ? '🆗' : '❌'}</div>
                                <div>Faróis: {chk.farois ? '🆗' : '❌'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      <footer className="bg-white border-t border-slate-150 py-6 text-center text-xs text-slate-400 font-medium mt-12">
        <p>© 2026 Secretaria Municipal de Saúde. Todos os direitos reservados.</p>
        <p className="mt-1 text-[10px] text-slate-300 font-mono">TFD-v1.0.0-PROD</p>
      </footer>

    </div>
  );
}
