/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${
              type === 'danger' ? 'bg-red-50 text-red-600' :
              type === 'warning' ? 'bg-amber-50 text-amber-600' :
              'bg-blue-50 text-blue-600'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
          {message}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer text-center focus:outline-none ${
              type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' :
              type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' :
              'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
