/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Truck, Landmark, ClipboardList, Database, Users, ShieldAlert, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import Navbar from './components/Navbar.js';
import LoginRegister from './components/LoginRegister.js';
import AdminUsers from './components/AdminUsers.js';
import VehiclesSection from './components/VehiclesSection.js';
import DriversSection from './components/DriversSection.js';
import HospitalsSection from './components/HospitalsSection.js';
import SchedulesSection from './components/SchedulesSection.js';
import BackupSection from './components/BackupSection.js';
import DriverChecklistSection from './components/DriverChecklistSection.js';
import { User as UserType } from './types.js';

type TabType = 'schedules' | 'vehicles' | 'drivers' | 'hospitals' | 'users' | 'backups';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('schedules');
  const [backupDoneToday, setBackupDoneToday] = useState(true);
  const [appInitializing, setAppInitializing] = useState(true);

  // Authenticate session from local storage on mount
  useEffect(() => {
    const session = localStorage.getItem('tfd_session_user');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        // Validate with server
        fetch('/api/auth/me', {
          headers: { 'x-user-id': parsed.token || parsed.id }
        })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Invalido');
          })
          .then(data => {
            // Update stored session with refreshed token if present
            localStorage.setItem('tfd_session_user', JSON.stringify(data.user));
            setCurrentUser(data.user);
            fetchBackupStatus(data.user.token || data.user.id);
          })
          .catch(() => {
            localStorage.removeItem('tfd_session_user');
            setCurrentUser(null);
          })
          .finally(() => {
            setAppInitializing(false);
          });
      } catch {
        localStorage.removeItem('tfd_session_user');
        setCurrentUser(null);
        setAppInitializing(false);
      }
    } else {
      setAppInitializing(false);
    }
  }, []);

  const fetchBackupStatus = async (userId: string) => {
    try {
      const response = await fetch('/api/backup/status', {
        headers: { 'x-user-id': userId }
      });
      if (response.ok) {
        const data = await response.json();
        setBackupDoneToday(data.doneToday);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (user: UserType) => {
    localStorage.setItem('tfd_session_user', JSON.stringify(user));
    setCurrentUser(user);
    fetchBackupStatus(user.token || user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('tfd_session_user');
    setCurrentUser(null);
    setActiveTab('schedules');
  };

  if (appInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-sm text-slate-500 font-semibold">Iniciando Portal TFD...</p>
      </div>
    );
  }

  // Not logged in -> Show Login/Register forms
  if (!currentUser) {
    return <LoginRegister onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.profile === 'Motorista') {
    return <DriverChecklistSection currentUser={currentUser} onLogout={handleLogout} />;
  }

  const isAdmin = currentUser.profile === 'Administrador';

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800">
      
      {/* Top Navbar */}
      <Navbar 
        currentUser={currentUser} 
        backupDoneToday={backupDoneToday} 
        onLogout={handleLogout}
        onOpenBackups={() => setActiveTab('backups')}
      />

      {/* Main navigation row */}
      <div className="bg-white border-b border-slate-150 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-3 overflow-x-auto scrollbar-none" aria-label="Abas decoradas">
            
            {/* Abas */}
            <button
              id="nav-to-schedules"
              onClick={() => setActiveTab('schedules')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none shrink-0 ${
                activeTab === 'schedules'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Viagens e Agendamentos</span>
            </button>

            <button
              id="nav-to-vehicles"
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none shrink-0 ${
                activeTab === 'vehicles'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Gestão de Veículos</span>
            </button>

            <button
              id="nav-to-drivers"
              onClick={() => setActiveTab('drivers')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none shrink-0 ${
                activeTab === 'drivers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Motoristas</span>
            </button>

            <button
              id="nav-to-hospitals"
              onClick={() => setActiveTab('hospitals')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none shrink-0 ${
                activeTab === 'hospitals'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Landmark className="h-4 w-4" />
              <span>Hospitais de Destino</span>
            </button>

            {isAdmin && (
              <button
                id="nav-to-users"
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none shrink-0 ${
                  activeTab === 'users'
                    ? 'bg-red-600 text-white shadow-md shadow-red-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Controle de Usuários</span>
              </button>
            )}

            <button
              id="nav-to-backups"
              onClick={() => setActiveTab('backups')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none shrink-0 ${
                activeTab === 'backups'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Banco & Backup</span>
            </button>

          </nav>
        </div>
      </div>

      {/* Main Page Area Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Global Warning notice for non-admin profiles on backup (if any) */}
        {!backupDoneToday && (
          <div id="general-backup-banner" className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              <span>O backup manual diário das tabelas do servidor ainda não foi efetuado. Por favor, execute-o para garantir a conformidade dos dados.</span>
            </div>
            <button
              id="go-to-backups-tab-btn"
              onClick={() => setActiveTab('backups')}
              className="ml-4 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xxs tracking-wider uppercase font-bold transition-all focus:outline-none"
            >
              Ir para backups
            </button>
          </div>
        )}

        <div className="animate-fadeIn">
          {activeTab === 'schedules' && (
            <SchedulesSection 
              currentUser={currentUser} 
              onOpenHospitals={() => setActiveTab('hospitals')} 
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesSection 
              currentUserId={currentUser.token || currentUser.id} 
              userProfile={currentUser.profile} 
            />
          )}

          {activeTab === 'drivers' && (
            <DriversSection 
              currentUserId={currentUser.token || currentUser.id} 
              userProfile={currentUser.profile} 
            />
          )}

          {activeTab === 'hospitals' && (
            <HospitalsSection 
              currentUserId={currentUser.token || currentUser.id} 
              userProfile={currentUser.profile} 
            />
          )}

          {activeTab === 'users' && isAdmin && (
            <AdminUsers currentUserId={currentUser.token || currentUser.id} />
          )}

          {activeTab === 'backups' && (
            <BackupSection 
              currentUser={currentUser} 
              backupDoneToday={backupDoneToday} 
              onBackupExecuted={() => setBackupDoneToday(true)} 
            />
          )}
        </div>
      </main>

      {/* Humble governmental layout footer */}
      <footer className="bg-white border-t border-slate-150 py-6 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 Secretaria Municipal de Saúde. Todos os direitos reservados.</p>
        <p className="mt-1 text-[10px] text-slate-300 font-mono">TFD-v1.0.0-PROD</p>
      </footer>

    </div>
  );
}
