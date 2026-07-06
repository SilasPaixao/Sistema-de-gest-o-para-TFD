/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import { DatabaseManager, getTodayString, DbUser } from './server/db.js';
import { Vehicle, Driver, Hospital, Schedule, HistoryLog, UserProfile, RequestMedicalType } from './src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-tfd-super-secret-key-12345';

const PORT = 3000;

async function startServer() {
  // Initialize Database
  await DatabaseManager.init();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Middleware to authenticate user via 'x-user-id' header
  const getRequestUser = (req: express.Request): DbUser | null => {
    const headerValue = req.headers['x-user-id'] as string;
    if (!headerValue) return null;

    const users = DatabaseManager.getUsers();

    try {
      // Try verifying header as JWT token
      const decoded = jwt.verify(headerValue, JWT_SECRET) as any;
      if (decoded && decoded.id) {
        return users.find(u => u.id === decoded.id && u.status === 'aprovado') || null;
      }
    } catch (err) {
      // Fallback: search by plain ID if the header value is not a valid/unexpired JWT
    }

    // Direct match fallback (for bootstrap admin or older sessions)
    return users.find(u => u.id === headerValue && u.status === 'aprovado') || null;
  };

  // Auth endpoints
  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, password, name, profile } = req.body;
      if (!username || !password || !name || !profile) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const users = DatabaseManager.getUsers();
      const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: 'Este nome de usuário já está cadastrado' });
      }

      const newUser: DbUser = {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        username,
        password,
        name,
        profile: profile as UserProfile,
        status: 'pendente', // Starts as pending per specifications
        createdAt: new Date().toISOString()
      };

      DatabaseManager.saveUser(newUser);
      res.status(201).json({ 
        message: 'Cadastro realizado com sucesso! Aguarde a aprovação de um administrador.',
        user: { id: newUser.id, username: newUser.username, name: newUser.name, profile: newUser.profile, status: newUser.status }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      const users = DatabaseManager.getUsers();
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }

      if (user.status === 'pendente') {
        return res.status(403).json({ error: 'Seu cadastro está pendente de aprovação por um administrador.' });
      }

      if (user.status === 'rejeitado') {
        return res.status(403).json({ error: 'Seu cadastro foi rejeitado por um administrador.' });
      }

      // Sign JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, profile: user.profile },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        user: {
          id: user.id,
          token,
          username: user.username,
          name: user.name,
          profile: user.profile,
          status: user.status
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    // Refresh JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, profile: user.profile },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        id: user.id,
        token,
        username: user.username,
        name: user.name,
        profile: user.profile,
        status: user.status
      }
    });
  });

  // Users Admin Management
  app.get('/api/users', (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.profile !== 'Administrador') {
      return res.status(403).json({ error: 'Apenas administradores podem acessar a lista de usuários' });
    }

    const allUsers = DatabaseManager.getUsers().map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      profile: u.profile,
      status: u.status,
      createdAt: u.createdAt
    }));

    res.json(allUsers);
  });

  app.post('/api/users/:id/approve', (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.profile !== 'Administrador') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar usuários' });
    }

    const targetId = req.params.id;
    const users = DatabaseManager.getUsers();
    const targetUser = users.find(u => u.id === targetId);

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    targetUser.status = 'aprovado';
    DatabaseManager.saveUser(targetUser);
    res.json({ message: 'Usuário aprovado com sucesso', user: targetUser });
  });

  app.post('/api/users/:id/reject', (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.profile !== 'Administrador') {
      return res.status(403).json({ error: 'Apenas administradores podem rejeitar solicitações' });
    }

    const targetId = req.params.id;
    const users = DatabaseManager.getUsers();
    const targetUser = users.find(u => u.id === targetId);

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Don't reject the bootstrap admin or current logged user
    if (targetUser.username === 'admin' || targetUser.id === user.id) {
      return res.status(400).json({ error: 'Não é possível rejeitar ou alterar o status do administrador principal' });
    }

    targetUser.status = 'rejeitado';
    DatabaseManager.saveUser(targetUser);
    res.json({ message: 'Solicitação rejeitada com sucesso' });
  });

  // Vehicles endpoints
  app.get('/api/vehicles', (req, res) => {
    // Visible to all authenticated users
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    res.json(DatabaseManager.getVehicles());
  });

  app.post('/api/vehicles', (req, res) => {
    const user = getRequestUser(req);
    // Permissão: Administradores e Coordenadores
    if (!user || (user.profile !== 'Administrador' && user.profile !== 'Coordenador')) {
      return res.status(403).json({ error: 'Permissão negada para cadastrar veículos' });
    }

    const { type, plate, model, brand, maxPassengers } = req.body;
    if (!type || !plate || !model || !brand || !maxPassengers) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios para o cadastro de veículos' });
    }

    const newVehicle: Vehicle = {
      id: 'vehicle-' + Math.random().toString(36).substr(2, 9),
      type,
      plate,
      model,
      brand,
      maxPassengers: Number(maxPassengers)
    };

    DatabaseManager.saveVehicle(newVehicle);
    res.status(201).json(newVehicle);
  });

  // Motoristas endpoints
  app.get('/api/drivers', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    res.json(DatabaseManager.getDrivers());
  });

  app.post('/api/drivers', (req, res) => {
    const user = getRequestUser(req);
    if (!user || (user.profile !== 'Administrador' && user.profile !== 'Coordenador')) {
      return res.status(403).json({ error: 'Permissão negada para cadastrar motoristas' });
    }

    const { fullName, contact } = req.body;
    if (!fullName || !contact) {
      return res.status(400).json({ error: 'Nome completo e contato são obrigatórios' });
    }

    const newDriver: Driver = {
      id: 'driver-' + Math.random().toString(36).substr(2, 9),
      fullName,
      contact
    };

    DatabaseManager.saveDriver(newDriver);
    res.status(201).json(newDriver);
  });

  // Hospitals endpoints
  app.get('/api/hospitals', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    res.json(DatabaseManager.getHospitals());
  });

  app.post('/api/hospitals', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const { name, address, googleMapsUrl, contacts } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'Nome do hospital e endereço são obrigatórios' });
    }

    const contactArray = Array.isArray(contacts) ? contacts.slice(0, 10) : [];

    const newHospital: Hospital = {
      id: 'hospital-' + Math.random().toString(36).substr(2, 9),
      name,
      address,
      googleMapsUrl,
      contacts: contactArray
    };

    DatabaseManager.saveHospital(newHospital);
    res.status(201).json(newHospital);
  });

  // Bulk import hospitals via JSON
  app.post('/api/hospitals/import', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    try {
      const data = req.body;
      const parsedHospitals: Hospital[] = [];

      const processHospitalObj = (obj: any) => {
        const name = obj.nomeHospital || obj.name;
        const address = obj.endereco || obj.address;
        const googleMaps = obj.googleMaps || obj.googleMapsUrl || '';
        const contacts = Array.isArray(obj.contatos || obj.contacts) ? (obj.contatos || obj.contacts).slice(0, 10) : [];

        if (!name || !address) {
          throw new Error('Nome do hospital e endereço são obrigatórios para todos os registros.');
        }

        return {
          id: 'hospital-' + Math.random().toString(36).substr(2, 9),
          name,
          address,
          googleMapsUrl: googleMaps,
          contacts: contacts.map((c: any) => String(c))
        };
      };

      if (Array.isArray(data)) {
        for (const item of data) {
          parsedHospitals.push(processHospitalObj(item));
        }
      } else if (typeof data === 'object' && data !== null) {
        parsedHospitals.push(processHospitalObj(data));
      } else {
        return res.status(400).json({ error: 'Formato de importação inválido. Deve ser um JSON com objeto ou array.' });
      }

      DatabaseManager.saveHospitalsBulk(parsedHospitals);
      res.json({ message: `${parsedHospitals.length} hospitais importados com sucesso.`, hospitals: parsedHospitals });
    } catch (e: any) {
      res.status(400).json({ error: `Falha na importação: ${e.message}` });
    }
  });

  // Helper function to check vehicle occupancy map for a driver or user
  // Overlapping schedules logic
  const getOccupancyOnDates = (vehicleId: string, startDate: string, endDate: string, excludeScheduleId?: string): { [dateStr: string]: number } => {
    const schedules = DatabaseManager.getSchedules();
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    
    // Generate map of dates
    const occupancy: { [dateStr: string]: number } = {};
    const curr = new Date(startObj);
    while (curr <= endObj) {
      const isoYMD = curr.toISOString().split('T')[0];
      occupancy[isoYMD] = 0;
      curr.setDate(curr.getDate() + 1);
    }

    // Fill with overlapping schedules
    for (const s of schedules) {
      if (s.vehicleId !== vehicleId) continue;
      if (excludeScheduleId && s.id === excludeScheduleId) continue;

      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);

      // Add occupancy to overlapping days
      for (const dateYMD in occupancy) {
        const dObj = new Date(dateYMD);
        if (dObj >= sStart && dObj <= sEnd) {
          occupancy[dateYMD] += 1;
        }
      }
    }

    return occupancy;
  };

  // Occupancy alert endpoint: Check if ALL vehicles are full on any date of interest
  app.get('/api/occupancy-check', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const { date } = req.query as { date?: string };
    if (!date) return res.status(400).json({ error: 'Data não informada' });

    const vehicles = DatabaseManager.getVehicles();
    if (vehicles.length === 0) {
      return res.json({ allVehiclesFull: false, message: 'Nenhum veículo cadastrado ainda.' });
    }

    // Check vacancy for each vehicle on this specific date
    let allFull = true;
    const list = [];

    for (const v of vehicles) {
      const occupancy = getOccupancyOnDates(v.id, date, date);
      const booked = occupancy[date] || 0;
      const vagasRestantes = v.maxPassengers - booked;
      list.push({
        id: v.id,
        model: v.model,
        plate: v.plate,
        capacity: v.maxPassengers,
        booked,
        full: vagasRestantes <= 0
      });

      if (vagasRestantes > 0) {
        allFull = false;
      }
    }

    res.json({
      allVehiclesFull: allFull,
      vehicles: list,
      date
    });
  });

  // Get active occupancy statistics for overlapping dates
  app.get('/api/schedules', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    res.json(DatabaseManager.getSchedules());
  });

  app.get('/api/schedules/history', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    res.json(DatabaseManager.getHistory());
  });

  app.post('/api/schedules', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const { patientName, startDate, endDate, vehicleId, hospitalId, requestType, recurrentTypeDetails } = req.body;
    
    if (!patientName || !startDate || !endDate || !vehicleId || !hospitalId || !requestType) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    const vehicles = DatabaseManager.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    // Validate dates range validity
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'A data de ida não pode ser posterior à data de volta' });
    }

    // Calculate occupancy map
    const occupancy = getOccupancyOnDates(vehicleId, startDate, endDate);
    
    // Check if on any date the capacity would be exceeded
    const fullDateRange: string[] = [];
    for (const dStr in occupancy) {
      const booked = occupancy[dStr];
      if (booked >= vehicle.maxPassengers) {
        fullDateRange.push(dStr);
      }
    }

    if (fullDateRange.length > 0) {
      return res.status(400).json({ 
        error: `O veículo ${vehicle.model} já está lotado em algumas das datas selecionadas!`,
        datesFull: fullDateRange
      });
    }

    const newSchedule: Schedule = {
      id: 'schedule-' + Math.random().toString(36).substr(2, 9),
      patientName,
      startDate,
      endDate,
      vehicleId,
      hospitalId,
      requestType: requestType as RequestMedicalType,
      recurrentTypeDetails: requestType === 'Procedimento especializado recorrente' ? recurrentTypeDetails : undefined,
      createdByUserId: user.id,
      createdByUserName: user.name,
      createdAt: new Date().toISOString()
    };

    DatabaseManager.saveSchedule(newSchedule);
    res.status(201).json(newSchedule);
  });

  app.put('/api/schedules/:id', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const schedId = req.params.id;
    const schedules = DatabaseManager.getSchedules();
    const existingSched = schedules.find(s => s.id === schedId);

    if (!existingSched) {
      return res.status(440).json({ error: 'Agendamento não encontrado' });
    }

    // Permissões:
    // "Apenas o usuário que criou o agendamento poderá editá-lo."
    // "Administradores também poderão editar qualquer agendamento."
    if (existingSched.createdByUserId !== user.id && user.profile !== 'Administrador') {
      return res.status(403).json({ error: 'Permissão negada. Apenas quem criou este agendamento ou um Administrador pode alterá-lo.' });
    }

    const { patientName, startDate, endDate, vehicleId, hospitalId, requestType, recurrentTypeDetails } = req.body;
    
    if (!patientName || !startDate || !endDate || !vehicleId || !hospitalId || !requestType) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    const vehicles = DatabaseManager.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não cadastrado' });
    }

    // Check occupancy, exclude this scheduling's current seat allocation in the checks
    const occupancy = getOccupancyOnDates(vehicleId, startDate, endDate, schedId);
    
    // Check if on any date the capacity was exceeded
    const fullDateRange: string[] = [];
    for (const dStr in occupancy) {
      if (occupancy[dStr] >= vehicle.maxPassengers) {
        fullDateRange.push(dStr);
      }
    }

    if (fullDateRange.length > 0) {
      return res.status(400).json({ 
        error: `O veículo ${vehicle.model} já está lotado em algumas das datas especificadas!`,
        datesFull: fullDateRange
      });
    }

    // Update fields
    existingSched.patientName = patientName;
    existingSched.startDate = startDate;
    existingSched.endDate = endDate;
    existingSched.vehicleId = vehicleId;
    existingSched.hospitalId = hospitalId;
    existingSched.requestType = requestType as RequestMedicalType;
    existingSched.recurrentTypeDetails = requestType === 'Procedimento especializado recorrente' ? recurrentTypeDetails : undefined;
    
    DatabaseManager.saveSchedule(existingSched);
    res.json(existingSched);
  });

  // Concluir viagem (Dar Baixa)
  app.post('/api/schedules/:id/conclude', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const schedId = req.params.id;
    const schedules = DatabaseManager.getSchedules();
    const sched = schedules.find(s => s.id === schedId);

    if (!sched) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Apenas quem criou ou Admin pode dar a baixa
    if (sched.createdByUserId !== user.id && user.profile !== 'Administrador') {
      return res.status(403).json({ error: 'Permissão negada. Apenas quem criou este agendamento ou um Administrador pode efetuar a baixa.' });
    }

    // Valida se a viagem já terminou (after return date)
    // "Após a data de retorno da viagem, o responsável deverá receber notificação e dar baixa"
    const todayStr = getTodayString();
    if (sched.endDate > todayStr) {
      return res.status(400).json({ error: `Este agendamento só pode ser baixado após a data de retorno (${sched.endDate})` });
    }

    // Recover vehicle and hospital info for the audit log
    const vehicles = DatabaseManager.getVehicles();
    const hospitals = DatabaseManager.getHospitals();
    const vehicleObj = vehicles.find(v => v.id === sched.vehicleId);
    const hospitalObj = hospitals.find(h => h.id === sched.hospitalId);

    const vehicleDetails = vehicleObj ? `${vehicleObj.model} (${vehicleObj.plate})` : 'Veículo Desconhecido';
    const hospitalName = hospitalObj ? hospitalObj.name : 'Hospital Desconhecido';

    // Move to history
    const historyItem: HistoryLog = {
      id: 'history-' + Math.random().toString(36).substr(2, 9),
      patientName: sched.patientName,
      startDate: sched.startDate,
      endDate: sched.endDate,
      vehicleDetails,
      hospitalName,
      requestType: sched.recurrentTypeDetails ? `${sched.requestType} (${sched.recurrentTypeDetails})` : sched.requestType,
      createdByUserName: sched.createdByUserName,
      completedAt: new Date().toISOString(),
      completedByUserName: user.name
    };

    // Remove from active schedules
    DatabaseManager.deleteSchedule(schedId);
    // Save to history
    DatabaseManager.saveHistory(historyItem);

    res.json({ message: 'Baixa da viagem realizada com sucesso! Registro armazenado no histórico.', history: historyItem });
  });

  // System Backup Configuration
  app.get('/api/backup/status', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const settings = DatabaseManager.getSettings();
    const todayStr = getTodayString();
    const doneToday = settings.lastBackupDate === todayStr;

    res.json({
      doneToday,
      lastBackupDate: settings.lastBackupDate || 'Nenhum backup realizado',
      backupFolder: settings.backupFolder || 'backups'
    });
  });

  app.get('/api/backup/settings', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    res.json(DatabaseManager.getSettings());
  });

  app.post('/api/backup/settings', (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.profile !== 'Administrador') {
      return res.status(403).json({ error: 'Apenas administradores podem atualizar as configurações de backup' });
    }

    const { backupFolder } = req.body;
    if (!backupFolder) {
      return res.status(400).json({ error: 'Caminho da pasta é obrigatório' });
    }

    DatabaseManager.saveSettings({ backupFolder: backupFolder.trim() });
    res.json({ message: 'Configurações de backup atualizadas!', settings: DatabaseManager.getSettings() });
  });

  app.post('/api/backup/run', (req, res) => {
    const user = getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const result = DatabaseManager.executeBackup();
    if (result.success) {
      res.json({ message: 'Backup manual diário executado com sucesso!', ...result });
    } else {
      res.status(500).json({ error: `Falha ao realizar o backup: ${result.error}`, ...result });
    }
  });


  // --- Vite Dev Server Middleware or Static Client Serving ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] TFD server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SERVER] Startup failed:', err);
});
