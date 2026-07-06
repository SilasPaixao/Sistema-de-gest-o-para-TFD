/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, LogOut, ShieldAlert, Database, CalendarDays } from 'lucide-react';
import { User as UserType } from '../types.js';

interface NavbarProps {
  currentUser: UserType;
  backupDoneToday: boolean;
  onLogout: () => void;
  onOpenBackups: () => void;
}

export default function Navbar({ currentUser, backupDoneToday, onLogout, onOpenBackups }: NavbarProps) {
  return (
    <header id="app-header" className="bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/35">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">TFD Municipal</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Secretaria de Saúde</p>
            </div>
          </div>

          {/* Center Backup Warning Alert Banner */}
          {!backupDoneToday && (
            <div 
              id="backup-warning-banner" 
              onClick={onOpenBackups}
              className="hidden md:flex items-center bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium text-xs px-3 py-1.5 rounded-full cursor-pointer hover:bg-amber-500/20 transition-all duration-200 animate-pulse"
            >
              <ShieldAlert className="h-4 w-4 mr-1.5 text-amber-400" />
              <span>Atenção: O backup diário ainda não foi realizado hoje!</span>
            </div>
          )}

          {/* Right Profile & Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <User className="h-4 w-4 text-blue-400" />
              <div className="text-left">
                <p id="user-display-name" className="text-xs font-semibold leading-tight text-slate-100">{currentUser.name}</p>
                <div className="flex items-center space-x-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    currentUser.profile === 'Administrador' ? 'bg-rose-500' :
                    currentUser.profile === 'Coordenador' ? 'bg-blue-500' : 'bg-slate-400'
                  }`} />
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase leading-none">{currentUser.profile}</p>
                </div>
              </div>
            </div>

            <button
              id="logout-btn"
              onClick={onLogout}
              className="bg-slate-800 text-slate-300 p-2 rounded-lg hover:text-red-400 hover:bg-slate-700 border border-slate-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              title="Sair do sistema"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Mobile Backup Warning banner */}
        {!backupDoneToday && (
          <div 
            id="backup-warning-banner-mobile"
            onClick={onOpenBackups}
            className="md:hidden py-2 px-3 bg-amber-500/20 border-t border-amber-500/30 text-amber-300 text-center text-xs font-medium cursor-pointer flex items-center justify-center"
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            <span>Backup diário pendente! Toque para realizar.</span>
          </div>
        )}
      </div>
    </header>
  );
}
