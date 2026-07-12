/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserProfile = 'Administrador' | 'Coordenador' | 'Usuário comum';
export type UserStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface User {
  id: string;
  token?: string;
  username: string;
  name: string;
  profile: UserProfile;
  status: UserStatus;
  createdAt: string;
}

export type VehicleType = 'Carro de pequeno porte' | 'Carro de grande porte' | 'Ambulância';

export interface Vehicle {
  id: string;
  type: VehicleType;
  plate: string;
  model: string;
  brand: string;
  maxPassengers: number;
}

export interface Driver {
  id: string;
  fullName: string;
  contact: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  googleMapsUrl?: string;
  contacts: string[];
}

export type RequestMedicalType = 'Consulta/Exame' | 'Cirurgia' | 'Procedimento especializado recorrente';

export type ConfirmationStatus = 'pendente' | 'confirmado' | 'sem_contato' | 'desistencia';

export interface Schedule {
  id: string;
  patientName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  vehicleId: string;
  returnVehicleId?: string;
  driverId?: string;
  returnDriverId?: string;
  hospitalId: string;
  requestType: RequestMedicalType;
  recurrentTypeDetails?: string; // Quimioterapia, Hemodiálise, Radioterapia, Outros
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  companionName?: string;
  companionPhone1?: string;
  companionPhone2?: string;
  isDeletionPending?: boolean;
  deletionRequestedAt?: string;
  deletionRequestedByUserId?: string;
  deletionRequestedByUserName?: string;
  deletedByAdminName?: string;
  confirmationStatus?: ConfirmationStatus;
  confirmationUpdatedBy?: string;
  confirmationUpdatedAt?: string;
}

export interface HistoryLog {
  id: string;
  patientName: string;
  startDate: string;
  endDate: string;
  vehicleDetails: string; // e.g., "Modelo (Placa)"
  hospitalName: string;
  requestType: string;
  createdByUserName: string;
  completedAt: string;
  completedByUserName: string;
}

export interface SystemSettings {
  backupFolder: string;
  lastBackupDate: string; // YYYY-MM-DD of the last performed backup
}

export interface DbSchema {
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  hospitals: Hospital[];
  schedules: Schedule[];
  history: HistoryLog[];
  settings: SystemSettings;
}
