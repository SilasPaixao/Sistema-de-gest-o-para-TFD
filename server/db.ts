/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DbSchema, User, Vehicle, Driver, Hospital, Schedule, HistoryLog, SystemSettings } from '../src/types.js';

const { Pool } = pg;

// Extend User in the database with password
export interface DbUser extends User {
  password?: string;
}

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Helper to format ISO date as YYYY-MM-DD
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const defaultDb: {
  users: DbUser[];
  vehicles: Vehicle[];
  drivers: Driver[];
  hospitals: Hospital[];
  schedules: Schedule[];
  history: HistoryLog[];
  settings: SystemSettings;
} = {
  users: [
    {
      id: 'admin-bootstrap-id',
      username: 'admin',
      password: '87304508', // Requisito do bootstrap administradores
      name: 'Administrador Padrão',
      profile: 'Administrador',
      status: 'aprovado',
      createdAt: new Date().toISOString(),
    }
  ],
  vehicles: [],
  drivers: [],
  hospitals: [],
  schedules: [],
  history: [],
  settings: {
    backupFolder: 'backups',
    lastBackupDate: ''
  }
};

// In-memory cache synced with either PostgreSQL or local json db
let dbState = {
  users: [] as DbUser[],
  vehicles: [] as Vehicle[],
  drivers: [] as Driver[],
  hospitals: [] as Hospital[],
  schedules: [] as Schedule[],
  history: [] as HistoryLog[],
  settings: {
    backupFolder: 'backups',
    lastBackupDate: ''
  } as SystemSettings
};

let pool: pg.Pool | null = null;
let s3Client: S3Client | null = null;

function getDbPool(): pg.Pool | null {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    logger('Found DATABASE_URL connection string.');
    const hasSSL = connectionString.includes('sslmode=require') || connectionString.includes('ssl=true');
    const ssl = hasSSL ? { rejectUnauthorized: false } : undefined;
    
    pool = new Pool({
      connectionString,
      ssl,
    });
    return pool;
  }
  return null;
}

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;
  
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT;

  if (bucket && accessKeyId && secretAccessKey) {
    const s3Config: any = {
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
    };
    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.forcePathStyle = true;
    }
    s3Client = new S3Client(s3Config);
    logger(`S3 Client initialized. Bucket: ${bucket}, Region: ${region}, Endpoint: ${endpoint || 'AWS Standard'}`);
    return s3Client;
  }
  return null;
}

export class DatabaseManager {
  private static initPromise: Promise<void> | null = null;

  public static async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const dbPool = getDbPool();
        if (dbPool) {
          logger('PostgreSQL configuration found. Initializing database schemas...');
          try {
            // Create required PostgreSQL tables if they don't exist
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_users (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                profile VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at VARCHAR(255) NOT NULL
              );
            `);
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_vehicles (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(100) NOT NULL,
                plate VARCHAR(50) NOT NULL,
                model VARCHAR(255) NOT NULL,
                brand VARCHAR(255) NOT NULL,
                max_passengers INTEGER NOT NULL
              );
            `);
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_drivers (
                id VARCHAR(255) PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                contact VARCHAR(100) NOT NULL
              );
            `);
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_hospitals (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                google_maps_url TEXT,
                contacts TEXT NOT NULL
              );
            `);
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_schedules (
                id VARCHAR(255) PRIMARY KEY,
                patient_name VARCHAR(255) NOT NULL,
                start_date VARCHAR(50) NOT NULL,
                end_date VARCHAR(50) NOT NULL,
                vehicle_id VARCHAR(255) NOT NULL,
                hospital_id VARCHAR(255) NOT NULL,
                request_type VARCHAR(255) NOT NULL,
                recurrent_type_details TEXT,
                created_by_user_id VARCHAR(255) NOT NULL,
                created_by_user_name VARCHAR(255) NOT NULL,
                created_at VARCHAR(255) NOT NULL
              );
            `);
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_history_logs (
                id VARCHAR(255) PRIMARY KEY,
                patient_name VARCHAR(255) NOT NULL,
                start_date VARCHAR(50) NOT NULL,
                end_date VARCHAR(50) NOT NULL,
                vehicle_details VARCHAR(255) NOT NULL,
                hospital_name VARCHAR(255) NOT NULL,
                request_type VARCHAR(255) NOT NULL,
                created_by_user_name VARCHAR(255) NOT NULL,
                completed_at VARCHAR(255) NOT NULL,
                completed_by_user_name VARCHAR(255) NOT NULL
              );
            `);
            await dbPool.query(`
              CREATE TABLE IF NOT EXISTS tfd_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT NOT NULL
              );
            `);

            // Verify if we already have rows in tfd_users (seed check)
            const usersRes = await dbPool.query('SELECT * FROM tfd_users');
            if (usersRes.rowCount === 0) {
              logger('PostgreSQL tables are empty. Checking for migration from local JSON file...');
              let initialData = defaultDb;
              if (fs.existsSync(DB_FILE)) {
                try {
                  initialData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
                  logger('Found existing local database file db.json! Migrating to PostgreSQL...');
                } catch (e) {
                  logger('Local db.json not found or corrupted. Creating new tables.');
                }
              }

              // Ensure bootstrap admin
              const adminExists = (initialData.users || []).some((u: DbUser) => u.username === 'admin');
              if (!adminExists) {
                if (!initialData.users) initialData.users = [];
                initialData.users.push(defaultDb.users[0]);
              }

              // Load to in-memory state
              dbState.users = initialData.users || [];
              dbState.vehicles = initialData.vehicles || [];
              dbState.drivers = initialData.drivers || [];
              dbState.hospitals = initialData.hospitals || [];
              dbState.schedules = initialData.schedules || [];
              dbState.history = initialData.history || [];
              dbState.settings = initialData.settings || defaultDb.settings;

              // Insert into PG
              for (const u of dbState.users) {
                await dbPool.query(
                  `INSERT INTO tfd_users (id, username, password, name, profile, status, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
                  [u.id, u.username, u.password || '', u.name, u.profile, u.status, u.createdAt]
                );
              }
              for (const v of dbState.vehicles) {
                await dbPool.query(
                  `INSERT INTO tfd_vehicles (id, type, plate, model, brand, max_passengers)
                   VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
                  [v.id, v.type, v.plate, v.model, v.brand, v.maxPassengers]
                );
              }
              for (const d of dbState.drivers) {
                await dbPool.query(
                  `INSERT INTO tfd_drivers (id, full_name, contact)
                   VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                  [d.id, d.fullName, d.contact]
                );
              }
              for (const h of dbState.hospitals) {
                await dbPool.query(
                  `INSERT INTO tfd_hospitals (id, name, address, google_maps_url, contacts)
                   VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                  [h.id, h.name, h.address, h.googleMapsUrl || '', JSON.stringify(h.contacts)]
                );
              }
              for (const s of dbState.schedules) {
                await dbPool.query(
                  `INSERT INTO tfd_schedules (id, patient_name, start_date, end_date, vehicle_id, hospital_id, request_type, recurrent_type_details, created_by_user_id, created_by_user_name, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT DO NOTHING`,
                  [
                    s.id,
                    s.patientName,
                    s.startDate,
                    s.endDate,
                    s.vehicleId,
                    s.hospitalId,
                    s.requestType,
                    s.recurrentTypeDetails || null,
                    s.createdByUserId,
                    s.createdByUserName,
                    s.createdAt
                  ]
                );
              }
              for (const log of dbState.history) {
                await dbPool.query(
                  `INSERT INTO tfd_history_logs (id, patient_name, start_date, end_date, vehicle_details, hospital_name, request_type, created_by_user_name, completed_at, completed_by_user_name)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
                  [
                    log.id,
                    log.patientName,
                    log.startDate,
                    log.endDate,
                    log.vehicleDetails,
                    log.hospitalName,
                    log.requestType,
                    log.createdByUserName,
                    log.completedAt,
                    log.completedByUserName
                  ]
                );
              }
              await dbPool.query(
                `INSERT INTO tfd_settings (key, value)
                 VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                ['settings', JSON.stringify(dbState.settings)]
              );

              logger('PostgreSQL seeded and migrated successfully!');
            } else {
              logger('PostgreSQL tables contain data. Loading records into memory cache...');
              
              // Load users
              const usersRows = (await dbPool.query('SELECT * FROM tfd_users')).rows;
              dbState.users = usersRows.map(r => ({
                id: r.id,
                username: r.username,
                password: r.password,
                name: r.name,
                profile: r.profile,
                status: r.status,
                createdAt: r.created_at
              }));

              // Load vehicles
              const vehiclesRows = (await dbPool.query('SELECT * FROM tfd_vehicles')).rows;
              dbState.vehicles = vehiclesRows.map(r => ({
                id: r.id,
                type: r.type,
                plate: r.plate,
                model: r.model,
                brand: r.brand,
                maxPassengers: r.max_passengers
              }));

              // Load drivers
              const driversRows = (await dbPool.query('SELECT * FROM tfd_drivers')).rows;
              dbState.drivers = driversRows.map(r => ({
                id: r.id,
                fullName: r.full_name,
                contact: r.contact
              }));

              // Load hospitals
              const hospitalsRows = (await dbPool.query('SELECT * FROM tfd_hospitals')).rows;
              dbState.hospitals = hospitalsRows.map(r => {
                let contactsArr = [];
                try {
                  contactsArr = JSON.parse(r.contacts);
                } catch {
                  contactsArr = r.contacts ? r.contacts.split(',') : [];
                }
                return {
                  id: r.id,
                  name: r.name,
                  address: r.address,
                  googleMapsUrl: r.google_maps_url,
                  contacts: contactsArr
                };
              });

              // Load schedules
              const schedulesRows = (await dbPool.query('SELECT * FROM tfd_schedules')).rows;
              dbState.schedules = schedulesRows.map(r => ({
                id: r.id,
                patientName: r.patient_name,
                startDate: r.start_date,
                endDate: r.end_date,
                vehicleId: r.vehicle_id,
                hospitalId: r.hospital_id,
                requestType: r.request_type,
                recurrentTypeDetails: r.recurrent_type_details || undefined,
                createdByUserId: r.created_by_user_id,
                createdByUserName: r.created_by_user_name,
                createdAt: r.created_at
              }));

              // Load history logs
              const historyRows = (await dbPool.query('SELECT * FROM tfd_history_logs')).rows;
              dbState.history = historyRows.map(r => ({
                id: r.id,
                patientName: r.patient_name,
                startDate: r.start_date,
                endDate: r.end_date,
                vehicleDetails: r.vehicle_details,
                hospitalName: r.hospital_name,
                requestType: r.request_type,
                createdByUserName: r.created_by_user_name,
                completedAt: r.completed_at,
                completedByUserName: r.completed_by_user_name
              }));

              // Load settings
              const settingsRes = await dbPool.query('SELECT * FROM tfd_settings WHERE key = $1', ['settings']);
              if (settingsRes.rowCount > 0) {
                try {
                  dbState.settings = JSON.parse(settingsRes.rows[0].value);
                } catch {
                  dbState.settings = defaultDb.settings;
                }
              } else {
                dbState.settings = defaultDb.settings;
              }

              logger(`Loaded ${dbState.users.length} users, ${dbState.vehicles.length} vehicles, ${dbState.drivers.length} drivers, ${dbState.hospitals.length} hospitals, ${dbState.schedules.length} active travels, ${dbState.history.length} concluded history entries.`);
            }
          } catch (pgError) {
            console.error('PostgreSQL initialization failed. Falling back to local JSON file db.', pgError);
            pool = null; // reset pool
            await this.initFileDb();
          }
        } else {
          logger('PostgreSQL configuration not found. Initializing standard local JSON file db...');
          await this.initFileDb();
        }

        // Initialize S3 check
        getS3Client();
      })();
    }
    return this.initPromise;
  }

  private static async initFileDb(): Promise<void> {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      dbState = JSON.parse(JSON.stringify(defaultDb));
    } else {
      try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        let updated = false;

        if (!data.settings) {
          data.settings = { backupFolder: 'backups', lastBackupDate: '' };
          updated = true;
        }
        if (!data.users) {
          data.users = [];
          updated = true;
        }
        
        const adminExists = data.users.some((u: DbUser) => u.username === 'admin');
        if (!adminExists) {
          data.users.push(defaultDb.users[0]);
          updated = true;
        }

        dbState.users = data.users || [];
        dbState.vehicles = data.vehicles || [];
        dbState.drivers = data.drivers || [];
        dbState.hospitals = data.hospitals || [];
        dbState.schedules = data.schedules || [];
        dbState.history = data.history || [];
        dbState.settings = data.settings;

        if (updated) {
          fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        }
      } catch (e) {
        console.error('Failed reading DB file, recreating default:', e);
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
        dbState = JSON.parse(JSON.stringify(defaultDb));
      }
    }
  }

  private static async syncToFile(): Promise<void> {
    if (pool) return; // DB is synchronized with Postgres
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed syncing state to local JSON file:', e);
    }
  }

  public static getUsers(): DbUser[] {
    return dbState.users;
  }

  public static saveUser(user: DbUser): void {
    const idx = dbState.users.findIndex((u: DbUser) => u.id === user.id);
    if (idx >= 0) {
      dbState.users[idx] = user;
    } else {
      dbState.users.push(user);
    }

    // Write-through to db pool asynchronously (non-blocking)
    if (pool) {
      pool.query(
        `INSERT INTO tfd_users (id, username, password, name, profile, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password = EXCLUDED.password,
           name = EXCLUDED.name,
           profile = EXCLUDED.profile,
           status = EXCLUDED.status,
           created_at = EXCLUDED.created_at`,
        [user.id, user.username, user.password || '', user.name, user.profile, user.status, user.createdAt]
      ).catch(e => console.error('PostgreSQL saveUser failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static getVehicles(): Vehicle[] {
    return dbState.vehicles;
  }

  public static saveVehicle(vehicle: Vehicle): void {
    const idx = dbState.vehicles.findIndex((v: Vehicle) => v.id === vehicle.id);
    if (idx >= 0) {
      dbState.vehicles[idx] = vehicle;
    } else {
      dbState.vehicles.push(vehicle);
    }

    if (pool) {
      pool.query(
        `INSERT INTO tfd_vehicles (id, type, plate, model, brand, max_passengers)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           plate = EXCLUDED.plate,
           model = EXCLUDED.model,
           brand = EXCLUDED.brand,
           max_passengers = EXCLUDED.max_passengers`,
        [vehicle.id, vehicle.type, vehicle.plate, vehicle.model, vehicle.brand, vehicle.maxPassengers]
      ).catch(e => console.error('PostgreSQL saveVehicle failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static getDrivers(): Driver[] {
    return dbState.drivers;
  }

  public static saveDriver(driver: Driver): void {
    const idx = dbState.drivers.findIndex((d: Driver) => d.id === driver.id);
    if (idx >= 0) {
      dbState.drivers[idx] = driver;
    } else {
      dbState.drivers.push(driver);
    }

    if (pool) {
      pool.query(
        `INSERT INTO tfd_drivers (id, full_name, contact)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           contact = EXCLUDED.contact`,
        [driver.id, driver.fullName, driver.contact]
      ).catch(e => console.error('PostgreSQL saveDriver failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static getHospitals(): Hospital[] {
    return dbState.hospitals;
  }

  public static saveHospital(hospital: Hospital): void {
    const idx = dbState.hospitals.findIndex((h: Hospital) => h.id === hospital.id);
    if (idx >= 0) {
      dbState.hospitals[idx] = hospital;
    } else {
      dbState.hospitals.push(hospital);
    }

    if (pool) {
      pool.query(
        `INSERT INTO tfd_hospitals (id, name, address, google_maps_url, contacts)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           google_maps_url = EXCLUDED.google_maps_url,
           contacts = EXCLUDED.contacts`,
        [hospital.id, hospital.name, hospital.address, hospital.googleMapsUrl || '', JSON.stringify(hospital.contacts)]
      ).catch(e => console.error('PostgreSQL saveHospital failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static saveHospitalsBulk(hospitals: Hospital[]): void {
    hospitals.forEach((h) => {
      const idx = dbState.hospitals.findIndex((existing: Hospital) => existing.id === h.id || existing.name.toLowerCase().trim() === h.name.toLowerCase().trim());
      if (idx >= 0) {
        dbState.hospitals[idx] = { ...dbState.hospitals[idx], ...h };
      } else {
        dbState.hospitals.push(h);
      }
    });

    if (pool) {
      (async () => {
        for (const h of hospitals) {
          await pool!.query(
            `INSERT INTO tfd_hospitals (id, name, address, google_maps_url, contacts)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               address = EXCLUDED.address,
               google_maps_url = EXCLUDED.google_maps_url,
               contacts = EXCLUDED.contacts`,
            [h.id, h.name, h.address, h.googleMapsUrl || '', JSON.stringify(h.contacts)]
          );
        }
      })().catch(e => console.error('PostgreSQL saveHospitalsBulk failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static getSchedules(): Schedule[] {
    return dbState.schedules;
  }

  public static saveSchedule(schedule: Schedule): void {
    const idx = dbState.schedules.findIndex((s: Schedule) => s.id === schedule.id);
    if (idx >= 0) {
      dbState.schedules[idx] = schedule;
    } else {
      dbState.schedules.push(schedule);
    }

    if (pool) {
      pool.query(
        `INSERT INTO tfd_schedules (id, patient_name, start_date, end_date, vehicle_id, hospital_id, request_type, recurrent_type_details, created_by_user_id, created_by_user_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           patient_name = EXCLUDED.patient_name,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           vehicle_id = EXCLUDED.vehicle_id,
           hospital_id = EXCLUDED.hospital_id,
           request_type = EXCLUDED.request_type,
           recurrent_type_details = EXCLUDED.recurrent_type_details,
           created_by_user_id = EXCLUDED.created_by_user_id,
           created_by_user_name = EXCLUDED.created_by_user_name,
           created_at = EXCLUDED.created_at`,
        [
          schedule.id,
          schedule.patientName,
          schedule.startDate,
          schedule.endDate,
          schedule.vehicleId,
          schedule.hospitalId,
          schedule.requestType,
          schedule.recurrentTypeDetails || null,
          schedule.createdByUserId,
          schedule.createdByUserName,
          schedule.createdAt
        ]
      ).catch(e => console.error('PostgreSQL saveSchedule failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static deleteSchedule(id: string): void {
    dbState.schedules = dbState.schedules.filter((s: Schedule) => s.id !== id);

    if (pool) {
      pool.query('DELETE FROM tfd_schedules WHERE id = $1', [id])
        .catch(e => console.error('PostgreSQL deleteSchedule failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static getHistory(): HistoryLog[] {
    return dbState.history;
  }

  public static saveHistory(log: HistoryLog): void {
    dbState.history.push(log);

    if (pool) {
      pool.query(
        `INSERT INTO tfd_history_logs (id, patient_name, start_date, end_date, vehicle_details, hospital_name, request_type, created_by_user_name, completed_at, completed_by_user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           patient_name = EXCLUDED.patient_name,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           vehicle_details = EXCLUDED.vehicle_details,
           hospital_name = EXCLUDED.hospital_name,
           request_type = EXCLUDED.request_type,
           created_by_user_name = EXCLUDED.created_by_user_name,
           completed_at = EXCLUDED.completed_at,
           completed_by_user_name = EXCLUDED.completed_by_user_name`,
        [
          log.id,
          log.patientName,
          log.startDate,
          log.endDate,
          log.vehicleDetails,
          log.hospitalName,
          log.requestType,
          log.createdByUserName,
          log.completedAt,
          log.completedByUserName
        ]
      ).catch(e => console.error('PostgreSQL saveHistory failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static getSettings(): SystemSettings {
    return dbState.settings;
  }

  public static saveSettings(settings: Partial<SystemSettings>): void {
    dbState.settings = { ...dbState.settings, ...settings };

    if (pool) {
      pool.query(
        `INSERT INTO tfd_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value`,
        ['settings', JSON.stringify(dbState.settings)]
      ).catch(e => console.error('PostgreSQL saveSettings failed:', e));
    } else {
      this.syncToFile();
    }
  }

  public static executeBackup(): { success: boolean; folder: string; file: string; error?: string } {
    const folder = dbState.settings.backupFolder || 'backups';
    
    try {
      const targetDir = path.resolve(folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${getTodayString()}-${timestamp}.json`;
      const fullPath = path.join(targetDir, filename);
      
      fs.writeFileSync(fullPath, JSON.stringify(dbState, null, 2), 'utf-8');
      
      logger(`Backup successfully written locally to ${fullPath}`);
      
      // Async S3 backup if configured
      const s3 = getS3Client();
      const s3Bucket = process.env.S3_BUCKET;
      if (s3 && s3Bucket) {
        logger(`S3 configuration detected. Uploading backup ${filename} to S3 bucket ${s3Bucket}...`);
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        const s3Key = `backups/${filename}`;
        
        s3.send(new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: fileContent,
          ContentType: 'application/json'
        })).then(() => {
          logger(`Backup successfully uploaded to S3: s3://${s3Bucket}/${s3Key}`);
        }).catch(err => {
          console.error('Failed to upload backup to S3:', err);
        });
      }

      dbState.settings.lastBackupDate = getTodayString();
      this.saveSettings(dbState.settings);
      
      return {
        success: true,
        folder,
        file: filename
      };
    } catch (e: any) {
      console.error('Backup failed:', e);
      return {
        success: false,
        folder,
        file: '',
        error: e.message
      };
    }
  }
}

function logger(msg: string) {
  console.log(`[DB] ${msg}`);
}
