import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { SQL_WASM_BASE64 } from './sqlWasmBase64.ts';

let dbInstance: Database | null = null;
let DATA_DIR = path.join(process.cwd(), 'data');
let DB_FILE = path.join(DATA_DIR, 'digiskool.sqlite');

let firestoreInstance: Firestore | null = null;
function getCloudFirestore(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreInstance = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
    return firestoreInstance;
  } catch (err) {
    console.warn('Could not initialize cloud firestore backup:', err);
    return null;
  }
}

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(DATA_DIR, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
  } catch (err) {
    console.warn(`Cannot write to ${DATA_DIR}, falling back to /tmp/digiskool_data:`, err);
    DATA_DIR = path.join('/tmp', 'digiskool_data');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    DB_FILE = path.join(DATA_DIR, 'digiskool.sqlite');
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  ensureDataDirectory();

  let wasmBinary: Buffer | Uint8Array;
  try {
    wasmBinary = Buffer.from(SQL_WASM_BASE64, 'base64');
  } catch (err) {
    console.warn('Failed to load embedded wasm binary, falling back to disk:', err);
    wasmBinary = fs.readFileSync(path.join(process.cwd(), 'server', 'sql-wasm.wasm'));
  }

  const SQL = await initSqlJs({ wasmBinary });

  let initialBuffer: Buffer | Uint8Array | null = null;
  if (fs.existsSync(DB_FILE)) {
    try {
      initialBuffer = fs.readFileSync(DB_FILE);
    } catch {}
  }

  // Restore snapshot from persistent cloud store ONLY if local file is missing or empty (e.g. serverless cold start)
  if (!initialBuffer || initialBuffer.length === 0 || !fs.existsSync(DB_FILE)) {
    const cloudDb = getCloudFirestore();
    if (cloudDb) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const fetchPromise = getDoc(doc(cloudDb, 'system_state', 'sqlite_db'));
        const snap: any = await Promise.race([fetchPromise, timeoutPromise]);
        if (snap && typeof snap.exists === 'function' && snap.exists()) {
          const snapData = snap.data();
          if (snapData?.data && typeof snapData.data === 'string') {
            const cloudBuf = Buffer.from(snapData.data, 'base64');
            initialBuffer = cloudBuf;
            try {
              fs.writeFileSync(DB_FILE, cloudBuf);
              console.log(`[Database] Restored SQLite database from persistent cloud storage (${cloudBuf.length} bytes)`);
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[Database] Cloud database restore notice:', (e as any)?.message);
      }
    }
  }

  if (initialBuffer && initialBuffer.length > 0) {
    dbInstance = new SQL.Database(initialBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  initSchemaAndSeed(dbInstance);
  saveDb();

  return dbInstance;
}

let cloudSyncTimer: any = null;

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buf = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buf);

    // Debounced asynchronous cloud persistence (every 3 seconds)
    if (!cloudSyncTimer) {
      cloudSyncTimer = setTimeout(async () => {
        cloudSyncTimer = null;
        try {
          const cloudDb = getCloudFirestore();
          if (cloudDb && dbInstance) {
            const currentData = dbInstance.export();
            const currentBuf = Buffer.from(currentData);
            const b64 = currentBuf.toString('base64');
            await setDoc(doc(cloudDb, 'system_state', 'sqlite_db'), {
              data: b64,
              byteLength: currentBuf.length,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (cloudErr) {
          console.warn('[Database] Cloud persistence sync notice:', (cloudErr as any)?.message);
        }
      }, 3000);
    }
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

// SQL query helper
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runQuery(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const info = queryOne<{ id: number; changes: number }>('SELECT last_insert_rowid() as id, changes() as changes;');
  saveDb();
  return {
    lastInsertRowid: info?.id || 0,
    changes: info?.changes || 0
  };
}

function initSchemaAndSeed(db: Database) {
  // 1. System Settings
  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institute_name TEXT NOT NULL DEFAULT 'DigiSkool-Institute of Digital Skills',
      institute_subtitle TEXT NOT NULL DEFAULT 'Institute of Digital Skills',
      campuses TEXT NOT NULL DEFAULT 'Lahore & Okara',
      address TEXT NOT NULL DEFAULT 'Lahore Campus: First Floor 12-C, Commercial Market, NFC Society Lahore (Call: +92 331-715-5174) | Okara Office: 185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara (Call: +92 310-436-7347)',

      phone TEXT NOT NULL DEFAULT '+92 331-715-5174',
      email TEXT NOT NULL DEFAULT 'support@digiskool.pk',
      website TEXT NOT NULL DEFAULT 'https://digiskool.pk',
      currency TEXT NOT NULL DEFAULT 'PKR',
      currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
      voucher_prefix TEXT NOT NULL DEFAULT 'DS-VCH-',
      receipt_prefix TEXT NOT NULL DEFAULT 'DS-RCT-',
      expense_prefix TEXT NOT NULL DEFAULT 'DS-EXP-',
      admission_prefix TEXT NOT NULL DEFAULT 'DS-ADM-',
      reminder_days_before INTEGER DEFAULT 3,
      reminder_days_after INTEGER DEFAULT 2,
      email_notifications_enabled INTEGER DEFAULT 1,
      sms_notifications_enabled INTEGER DEFAULT 0,
      whatsapp_notifications_enabled INTEGER DEFAULT 1,
      bank1_title TEXT DEFAULT 'DIGISKOOL',
      bank1_name TEXT DEFAULT 'Bank Al Habib',
      bank1_account_no TEXT DEFAULT '57270081000203018',
      bank1_iban TEXT DEFAULT 'PK05BAHL5727008100020301',
      bank2_title TEXT DEFAULT 'DIGISKOOL',
      bank2_name TEXT DEFAULT 'Bank Islami',
      bank2_account_no TEXT DEFAULT '211100277400001',
      bank2_iban TEXT DEFAULT 'PK50BKIP0211100277400001',
      alert_email TEXT DEFAULT 'adnanmrao@gmail.com',
      last_backup_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Roles & Permissions
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      can_delete INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL REFERENCES roles(id),
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- active, inactive, disabled
      two_factor_secret TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      last_login_at TEXT,
      last_login_ip TEXT,
      last_active_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      ip TEXT,
      user_agent TEXT,
      device TEXT,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_email TEXT NOT NULL,
      user_name TEXT,
      role TEXT,
      ip TEXT,
      device TEXT,
      browser TEXT,
      status TEXT NOT NULL, -- success, failed
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL, -- security_alert, fee_reminder, payment_receipt, admission_welcome
      status TEXT NOT NULL DEFAULT 'delivered',
      related_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL, -- CREATE, UPDATE, ARCHIVE, RESTORE, VOID, REVERSE, PERMANENT_DELETE, LOGIN, LOGOUT, DISABLE_USER
      module TEXT NOT NULL, -- students, courses, batches, admissions, vouchers, payments, expenses, users, settings
      record_id TEXT,
      details TEXT,
      old_values TEXT,
      new_values TEXT,
      ip TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Courses, Modules, Lessons, Tools
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration TEXT NOT NULL,
      fee REAL NOT NULL,
      mode TEXT NOT NULL DEFAULT 'Onsite / Online', -- Onsite, Online, Onsite / Online
      status TEXT NOT NULL DEFAULT 'active', -- active, inactive, archived
      instructor TEXT,
      website_link TEXT,
      certificate_eligible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS course_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      order_num INTEGER DEFAULT 1,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      course_id INTEGER NOT NULL REFERENCES courses(id),
      instructor TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days TEXT NOT NULL, -- e.g. 'Mon, Wed, Fri'
      start_time TEXT NOT NULL, -- e.g. '04:00 PM'
      end_time TEXT NOT NULL, -- e.g. '06:00 PM'
      max_students INTEGER DEFAULT 25,
      mode TEXT NOT NULL DEFAULT 'Onsite / Online',
      classroom TEXT DEFAULT 'Lab 1',
      status TEXT NOT NULL DEFAULT 'active', -- upcoming, active, completed, cancelled
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Students & Guardians
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      registration_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      father_name TEXT,
      guardian_name TEXT,
      phone TEXT NOT NULL,
      whatsapp TEXT,
      email TEXT,
      cnic_bform TEXT,
      date_of_birth TEXT,
      gender TEXT DEFAULT 'Male',
      address TEXT,
      city TEXT DEFAULT 'Lahore',
      status TEXT NOT NULL DEFAULT 'active', -- active, inactive, completed, dropped, archived
      profile_photo TEXT,
      notes TEXT,
      admission_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_no TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL REFERENCES students(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      batch_id INTEGER NOT NULL REFERENCES batches(id),
      admission_date TEXT NOT NULL,
      course_fee REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_payable REAL NOT NULL,
      payment_plan TEXT DEFAULT 'full', -- full, installments
      initial_payment REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'confirmed', -- pending, confirmed, cancelled
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      batch_id INTEGER NOT NULL REFERENCES batches(id),
      admission_id INTEGER REFERENCES admissions(id),
      enrollment_date TEXT NOT NULL,
      course_fee REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_fee REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- active, completed, dropped, suspended
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Fee Vouchers, Items, Payments & Receipts
  db.run(`
    CREATE TABLE IF NOT EXISTS fee_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL REFERENCES students(id),
      enrollment_id INTEGER REFERENCES enrollments(id),
      course_id INTEGER REFERENCES courses(id),
      batch_id INTEGER REFERENCES batches(id),
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      fee_description TEXT NOT NULL,
      amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      late_fee REAL DEFAULT 0,
      total_payable REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, partial, paid, overdue, cancelled
      installment_no INTEGER,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      voucher_id INTEGER REFERENCES fee_vouchers(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL, -- Cash, Bank Transfer, Online Transfer, Card, Other
      transaction_ref TEXT,
      received_by INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'valid', -- valid, voided, reversed
      void_reason TEXT,
      voided_at TEXT,
      voided_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id),
      installment_no INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, partial, paid, overdue
      payment_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Expenses, Expense Vouchers & Accounts
  db.run(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_to TEXT NOT NULL,
      payment_method TEXT NOT NULL, -- Cash, Bank Transfer, Cheque, Online Transfer
      reference_no TEXT,
      receipt_attachment TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, paid, voided
      created_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      void_reason TEXT,
      voided_by INTEGER REFERENCES users(id),
      voided_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sub_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campus TEXT NOT NULL DEFAULT 'Lahore', -- 'Lahore' or 'Okara'
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'cash', -- cash, bank, wallet
      bank_name TEXT,
      account_number TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trx_date TEXT NOT NULL,
      type TEXT NOT NULL, -- income, expense
      account_type TEXT NOT NULL DEFAULT 'cash', -- cash, bank, wallet
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      reference_id TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'valid', -- valid, voided
      campus TEXT DEFAULT 'Lahore',
      sub_account_id INTEGER REFERENCES sub_accounts(id),
      sub_account_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      voucher_id INTEGER REFERENCES fee_vouchers(id),
      type TEXT NOT NULL, -- upcoming, due_today, overdue, installment, payment_confirmation
      channel TEXT NOT NULL DEFAULT 'whatsapp', -- email, sms, whatsapp, in_app
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent', -- pending, sent, failed
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL, -- info, alert, success, warning
      related_module TEXT,
      related_id TEXT,
      is_read INTEGER DEFAULT 0,
      user_id INTEGER, -- null for global admin notifications
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Staff Management Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      employee_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT DEFAULT 'Faculty',
      campus TEXT NOT NULL DEFAULT 'Lahore Office',
      office_location TEXT DEFAULT 'Lahore Office',
      arrival_time TEXT DEFAULT '9:00 AM',
      phone TEXT NOT NULL,
      email TEXT,
      joining_date TEXT,
      basic_salary REAL NOT NULL DEFAULT 35000,
      allowed_leaves INTEGER DEFAULT 2,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      campus TEXT NOT NULL DEFAULT 'Lahore Office',
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present', -- 'present', 'late', 'leave', 'absent', 'half_day', 'not_reached'
      arrival_time TEXT DEFAULT '9:00 AM',
      time_in TEXT,
      time_out TEXT,
      check_in_time TEXT,
      check_out_time TEXT,
      late_minutes INTEGER DEFAULT 0,
      remarks TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, date)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff_leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      designation TEXT,
      campus TEXT DEFAULT 'Lahore Office',
      leave_type TEXT NOT NULL, -- 'Half Day Leave', 'Full Day Leave', 'Sick Leave', 'Casual Leave', 'Emergency'
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS delete_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      module TEXT NOT NULL,
      record_id TEXT NOT NULL,
      record_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff_payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      campus TEXT NOT NULL DEFAULT 'Lahore Campus',
      month_year TEXT NOT NULL, -- e.g. '2026-09'
      basic_salary REAL NOT NULL,
      present_count INTEGER DEFAULT 0,
      leaves_count INTEGER DEFAULT 0,
      late_count INTEGER DEFAULT 0,
      absent_count INTEGER DEFAULT 0,
      leave_deduction REAL DEFAULT 0,
      late_deduction REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'paid'
      payment_date TEXT,
      payment_method TEXT,
      transaction_ref TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, month_year)
    );
  `);

  // Schema updates / migrations
  try { db.run(`ALTER TABLE students ADD COLUMN marital_status TEXT DEFAULT 'Single';`); } catch (e) {}
  try { db.run(`ALTER TABLE students ADD COLUMN nationality TEXT DEFAULT 'Pakistani';`); } catch (e) {}
  try { db.run(`ALTER TABLE students ADD COLUMN qualification TEXT DEFAULT '';`); } catch (e) {}
  try { db.run(`ALTER TABLE fee_vouchers ADD COLUMN second_installment_due_date TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE fee_vouchers ADD COLUMN second_installment_amount REAL DEFAULT 0;`); } catch (e) {}
  try { db.run(`ALTER TABLE fee_vouchers ADD COLUMN receipt_no TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE fee_vouchers ADD COLUMN payment_date TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE admissions ADD COLUMN second_installment_due_date TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE admissions ADD COLUMN second_installment_amount REAL DEFAULT 0;`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank1_title TEXT DEFAULT 'DIGISKOOL';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank1_name TEXT DEFAULT 'Bank Al Habib';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank1_account_no TEXT DEFAULT '57270081000203018';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank1_iban TEXT DEFAULT 'PK05BAHL5727008100020301';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank2_title TEXT DEFAULT 'DIGISKOOL';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank2_name TEXT DEFAULT 'Bank Islami';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank2_account_no TEXT DEFAULT '211100277400001';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN bank2_iban TEXT DEFAULT 'PK50BKIP0211100277400001';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN alert_email TEXT DEFAULT 'adnanmrao@gmail.com';`); } catch (e) {}
  try { db.run(`ALTER TABLE staff ADD COLUMN arrival_time TEXT DEFAULT '9:00 AM';`); } catch (e) {}
  try { db.run(`ALTER TABLE staff ADD COLUMN office_location TEXT DEFAULT 'Lahore Office';`); } catch (e) {}
  try { db.run(`ALTER TABLE staff_attendance ADD COLUMN arrival_time TEXT DEFAULT '9:00 AM';`); } catch (e) {}
  try { db.run(`ALTER TABLE staff_attendance ADD COLUMN time_in TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE staff_attendance ADD COLUMN time_out TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE staff_attendance ADD COLUMN remarks TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN permission_level TEXT DEFAULT 'full';`); } catch (e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN campus_access TEXT DEFAULT 'all';`); } catch (e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN allowed_modules TEXT DEFAULT 'all';`); } catch (e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN last_logout_at TEXT;`); } catch (e) {}

  // Safe columns for institutional email delivery and SMTP configuration
  try { db.run(`ALTER TABLE system_settings ADD COLUMN smtp_host TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN smtp_port INTEGER DEFAULT 587;`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN smtp_user TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN smtp_pass TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN smtp_from_email TEXT DEFAULT 'noreply@digiskool.pk';`); } catch (e) {}
  try { db.run(`ALTER TABLE system_settings ADD COLUMN smtp_from_name TEXT DEFAULT 'DigiSkool-Institute of Digital Skills';`); } catch (e) {}
  try {
    db.run(`UPDATE system_settings SET email = 'support@digiskool.pk' WHERE email = 'info@digiskool.pk' OR email = 'info@digiskool.edu.pk' OR email IS NULL;`);
    db.run(`UPDATE system_settings SET smtp_from_email = 'noreply@digiskool.pk' WHERE smtp_from_email = 'info@digiskool.pk' OR smtp_from_email IS NULL OR smtp_from_email = '';`);
  } catch (e) {}

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        template TEXT,
        status TEXT DEFAULT 'sent',
        error_message TEXT,
        sent_via TEXT DEFAULT 'smtp',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {}

  // Scrub old emails and ensure alert_email is adnanmrao@gmail.com
  try {
    db.run(`UPDATE system_settings SET alert_email = 'adnanmrao@gmail.com' WHERE alert_email LIKE '%jameshut%';`);
    db.run(`UPDATE users SET email = 'adnanmrao@gmail.com', name = 'Main Admin (Adnan Rao)', role = 'main_admin', permission_level = 'full', campus_access = 'all' WHERE LOWER(email) LIKE '%jameshut%';`);
    db.run(`DELETE FROM email_logs WHERE LOWER(recipient_email) LIKE '%jameshut%';`);
  } catch (e) {}

  // Update existing settings with official bank details
  try {
    db.run(`
      UPDATE system_settings SET
        bank1_title = 'DIGISKOOL',
        bank1_name = 'Bank Al Habib',
        bank1_account_no = '57270081000203018',
        bank1_iban = 'PK05BAHL5727008100020301',
        bank2_title = 'DIGISKOOL',
        bank2_name = 'Bank Islami',
        bank2_account_no = '211100277400001',
        bank2_iban = 'PK50BKIP0211100277400001',
        alert_email = 'adnanmrao@gmail.com'
      WHERE id = 1;
    `);
  } catch (e) {}

  // Seed default system settings if empty
  const settingsCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM system_settings;');
  if (!settingsCount || settingsCount.c === 0) {
    db.run(`
      INSERT INTO system_settings (
        institute_name, institute_subtitle, campuses, address, phone, email, website, currency, currency_symbol,
        voucher_prefix, receipt_prefix, expense_prefix, admission_prefix, alert_email
      ) VALUES (
        'DigiSkool-Institute of Digital Skills',
        'Institute of Digital Skills',
        'Lahore & Okara',
        'Lahore Campus: First Floor 12-C, Commercial Market, NFC Society Lahore (Call: +92 331-715-5174) | Okara Office: 185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara (Call: +92 310-436-7347)',
        '+92 331-715-5174',
        'support@digiskool.pk',
        'https://digiskool.pk',
        'PKR',
        'Rs.',
        'DS-VCH-',
        'DS-RCT-',
        'DS-EXP-',
        'DS-ADM-',
        'adnanmrao@gmail.com'
      );
    `);
  } else {
    // Update existing settings to reflect the official branding
    try { db.run("ALTER TABLE system_settings ADD COLUMN campuses TEXT DEFAULT 'Lahore & Okara';"); } catch (e) {}
    db.run(`
      UPDATE system_settings SET
        institute_name = 'DigiSkool-Institute of Digital Skills',
        institute_subtitle = 'Institute of Digital Skills',
        campuses = 'Lahore & Okara',
        address = 'Lahore Campus: First Floor 12-C, Commercial Market, NFC Society Lahore (Call: +92 331-715-5174) | Okara Office: 185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara (Call: +92 310-436-7347)',
        phone = '+92 331-715-5174',
        alert_email = 'adnanmrao@gmail.com'
      WHERE id = 1;
    `);
  }

  // Safe migrations for campus fields & two-factor authentication
  try { db.run("ALTER TABLE students ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch (e) {}
  try { db.run("ALTER TABLE batches ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch (e) {}
  try { db.run("ALTER TABLE admissions ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch (e) {}
  try { db.run("ALTER TABLE users ADD COLUMN two_factor_secret TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;"); } catch (e) {}

  // Non-destructive safe default campus assignment ONLY for records without campus set
  try {
    db.run(`UPDATE students SET campus = 'Okara Campus' WHERE (campus IS NULL OR campus = '') AND LOWER(COALESCE(city, '')) LIKE '%okara%';`);
    db.run(`UPDATE students SET campus = 'Lahore Campus' WHERE campus IS NULL OR campus = '';`);
    db.run(`UPDATE admissions SET campus = (SELECT COALESCE(s.campus, 'Lahore Campus') FROM students s WHERE s.id = admissions.student_id) WHERE campus IS NULL OR campus = '';`);
    db.run(`UPDATE batches SET campus = 'Lahore Campus' WHERE campus IS NULL OR campus = '';`);
  } catch (e) {}

  // Seed / Upsert the official roles
  db.run(`
    INSERT OR REPLACE INTO roles (id, name, description, can_delete) VALUES
    ('main_admin', 'Main Admin', 'Full Access, managing institute, users, security & data', 1),
    ('principal', 'Principal', 'Academic & campus management, admissions & approvals', 0),
    ('admin_hr', 'Admin/HR', 'Human resources, staff attendance, leaves & campus admin', 0),
    ('owner', 'Main Admin', 'Full Access, managing institute, users, security & data', 1),
    ('admin', 'Admin', 'Administrative operations', 0),
    ('accountant', 'Accountant', 'Accounts and fee collection', 0),
    ('admission_officer', 'Admission Officer', 'Student admissions and inquiries', 0),
    ('teacher', 'Teacher', 'Faculty and class management', 0),
    ('student', 'Student', 'Student portal access', 0);
  `);

  // Seed Users with hashed password ('DigiSkool@2025')
  const defaultPasswordHash = bcrypt.hashSync('DigiSkool@2025', 10);

  // Ensure authorized institutional staff members exist with appropriate role access
  const defaultInstitutionalUsers = [
    { email: 'adnanmrao@gmail.com', name: 'Adnan Rao (Main Admin)', role: 'owner', perm: 'full', campus: 'all', modules: 'all', phone: '0331-7155-174' },
    { email: 'jameshut629@gmail.com', name: 'James Hunt (Main Admin)', role: 'owner', perm: 'full', campus: 'all', modules: 'all', phone: '0331-7155-174' },
    { email: 'principal@digiskool.pk', name: 'Principal (Academic Head)', role: 'principal', perm: 'full', campus: 'all', modules: 'all', phone: '0331-7155174' },
    { email: 'adminhr@digiskool.pk', name: 'Admin / HR Manager (Miss Asma)', role: 'admin_hr', perm: 'full', campus: 'all', modules: 'all', phone: '0331-7155174' },
    { email: 'accountant@digiskool.pk', name: 'Senior Accountant (Finance)', role: 'accountant', perm: 'selective', campus: 'all', modules: 'dashboard,vouchers,finance,reports,settings', phone: '0331-7155174' },
    { email: 'admission@digiskool.pk', name: 'Admission Officer (Front Desk)', role: 'admission_officer', perm: 'selective', campus: 'all', modules: 'dashboard,students,admissions,courses,vouchers', phone: '0331-7155174' },
    { email: 'lahore.admin@digiskool.pk', name: 'Lahore Campus Admin', role: 'admin', perm: 'selective', campus: 'lahore', modules: 'all', phone: '0331-7155174' },
    { email: 'okara.admin@digiskool.pk', name: 'Okara Campus Admin', role: 'admin', perm: 'selective', campus: 'okara', modules: 'all', phone: '0310-4367347' },
    { email: 'teacher@digiskool.pk', name: 'Lead Instructor (Faculty)', role: 'teacher', perm: 'selective', campus: 'all', modules: 'dashboard,courses,students', phone: '0331-7155174' }
  ];

  for (const adm of defaultInstitutionalUsers) {
    const existing = queryOne<{ id: number }>('SELECT id FROM users WHERE LOWER(email) = ?;', [adm.email.toLowerCase()]);
    if (!existing) {
      db.run(`
        INSERT INTO users (name, email, password_hash, role, permission_level, campus_access, allowed_modules, phone, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active');
      `, [adm.name, adm.email.toLowerCase(), defaultPasswordHash, adm.role, adm.perm, adm.campus, adm.modules, adm.phone]);
    }
  }

  // Add is_online and last_logout_at columns if not present
  try { db.run("ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0;"); } catch(e){}
  try { db.run("ALTER TABLE users ADD COLUMN last_logout_at TEXT;"); } catch(e){}

  // Seed Expense Categories
  const expCatCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM expense_categories;');
  if (!expCatCount || expCatCount.c === 0) {
    const cats = [
      'Salaries', 'Electricity', 'Gas', 'Water', 'Internet', 'Rent',
      'Stationery', 'Books', 'Uniforms', 'Maintenance', 'Transport',
      'Cleaning', 'Security', 'Events', 'Marketing', 'Office Expenses', 'Miscellaneous'
    ];
    for (const cat of cats) {
      db.run('INSERT INTO expense_categories (name, description) VALUES (?, ?);', [cat, `${cat} category expenses`]);
    }
  }

  // Seed Official Courses with Official Pricing
  const coursesCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM courses;');
  if (!coursesCount || coursesCount.c === 0) {
    const courses = [
      {
        code: 'DS-AI',
        name: 'Artificial Intelligence (AI)',
        description: 'Comprehensive hands-on training on modern LLMs, Prompt Engineering, Agents, Fine-Tuning & Computer Vision.',
        duration: '1 Month',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Dr. Zeeshan Haider',
        website_link: 'https://digiskool.pk'
      },
      {
        code: 'DS-ADM',
        name: 'Advanced Digital Marketing',
        description: '360-degree digital growth strategies, performance marketing, conversion funnels, analytics and campaign optimization.',
        duration: '3 Months',
        fee: 40000,
        mode: 'Onsite / Online',
        instructor: 'Hamza Farooq',
        website_link: 'https://digiskool.pk/advanced-digital-marketing-course/'
      },
      {
        code: 'DS-WP',
        name: 'WordPress Website Development',
        description: 'Build enterprise blogs, corporate websites, e-commerce stores, custom Elementor themes, and speed optimization.',
        duration: '2 Months',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Bilal Ahmed',
        website_link: 'https://digiskool.pk/advance-wordpress-course/'
      },
      {
        code: 'DS-SEO',
        name: 'Search Engine Optimization (SEO)',
        description: 'Master on-page, technical, off-page backlinks, keyword research, Semrush, Ahrefs, and rank Google top results.',
        duration: '2 Months',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Ali Hassan',
        website_link: 'https://digiskool.pk/seo-course-in-pakistan/'
      },
      {
        code: 'DS-PPC',
        name: 'Google Ads / PPC (SEM)',
        description: 'Search campaigns, Display Ads, YouTube Video Ads, Performance Max, and conversion tracking.',
        duration: '2 Months',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Hamza Farooq',
        website_link: 'https://digiskool.pk/search-engine-marketing-course/'
      },
      {
        code: 'DS-SMM',
        name: 'Social Media Marketing (SMM)',
        description: 'Meta Ads Manager, Instagram monetization, TikTok viral strategies, copywriting, and client acquisition.',
        duration: '2 Months',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Ayesha Malik',
        website_link: 'https://digiskool.pk/social-media-marketing-course/'
      },
      {
        code: 'DS-GD',
        name: 'Graphic Designing',
        description: 'Professional visual branding, typography, vector design, social media kits, packaging, and commercial portfolios.',
        duration: '2 Months',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Usman Tariq',
        website_link: 'https://digiskool.pk/graphic-designing-course-in-pakistan/'
      },
      {
        code: 'DS-VE',
        name: 'Video Editing',
        description: 'Premiere Pro, After Effects, sound design, color grading, motion graphics, and viral short-form editing.',
        duration: '2 Months',
        fee: 25000,
        mode: 'Onsite / Online',
        instructor: 'Fahad Rehman',
        website_link: 'https://digiskool.pk/video-editing-course/'
      },
      {
        code: 'DS-SHP',
        name: 'Shopify E-commerce',
        description: 'End-to-end Dropshipping and private label store setup, product hunting, supplier sourcing, and checkout automation.',
        duration: '2 Months',
        fee: 45000,
        mode: 'Onsite / Online',
        instructor: 'Saad Shakeel',
        website_link: 'https://digiskool.pk/shopify/'
      },
      {
        code: 'DS-OM',
        name: 'Office Management',
        description: 'Microsoft Office 365, Advanced Excel, business communication, email etiquette, and institutional administration.',
        duration: '2 Months',
        fee: 20000,
        mode: 'Onsite / Online',
        instructor: 'Maryam Siddiqui',
        website_link: 'https://digiskool.pk'
      }
    ];

    for (const c of courses) {
      db.run(`
        INSERT INTO courses (code, name, description, duration, fee, mode, instructor, website_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `, [c.code, c.name, c.description, c.duration, c.fee, c.mode, c.instructor, c.website_link]);
    }

    // Tools for Graphic Designing
    const gdCourse = queryOne<{ id: number }>('SELECT id FROM courses WHERE code = "DS-GD";');
    if (gdCourse) {
      db.run('INSERT INTO course_tools (course_id, name, description) VALUES (?, ?, ?);', [
        gdCourse.id, 'Adobe Photoshop', 'Industry standard raster editing, digital retouching, and graphics composition'
      ]);
      db.run('INSERT INTO course_tools (course_id, name, description) VALUES (?, ?, ?);', [
        gdCourse.id, 'Adobe Illustrator', 'Vector art, logos, corporate brand identities, and high-resolution typography'
      ]);
    }

    // Tools for Video Editing
    const veCourse = queryOne<{ id: number }>('SELECT id FROM courses WHERE code = "DS-VE";');
    if (veCourse) {
      db.run('INSERT INTO course_tools (course_id, name, description) VALUES (?, ?, ?);', [
        veCourse.id, 'Adobe Premiere Pro', 'Non-linear video editing, multi-cam workflows, color grading'
      ]);
      db.run('INSERT INTO course_tools (course_id, name, description) VALUES (?, ?, ?);', [
        veCourse.id, 'Adobe After Effects', 'Motion graphics, visual effects, title animation'
      ]);
    }

    // Tools for AI
    const aiCourse = queryOne<{ id: number }>('SELECT id FROM courses WHERE code = "DS-AI";');
    if (aiCourse) {
      db.run('INSERT INTO course_tools (course_id, name, description) VALUES (?, ?, ?);', [
        aiCourse.id, 'Gemini & OpenAI API', 'Building agentic workflows and automated reasoning systems'
      ]);
      db.run('INSERT INTO course_tools (course_id, name, description) VALUES (?, ?, ?);', [
        aiCourse.id, 'Python & LangChain', 'RAG pipelines, vector embeddings, and local model orchestration'
      ]);
    }
  }

  // Seed Batches
  const batchesCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM batches;');
  if (!batchesCount || batchesCount.c === 0) {
    const allCourses = queryAll<{ id: number; code: string; name: string; instructor: string }>('SELECT id, code, name, instructor FROM courses;');
    for (const c of allCourses) {
      db.run(`
        INSERT INTO batches (batch_code, name, course_id, instructor, start_date, end_date, days, start_time, end_time, max_students, mode, classroom, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        `${c.code}-B1`,
        `${c.name} - Session 01`,
        c.id,
        c.instructor || 'Lead Instructor',
        '2026-03-01',
        '2026-05-01',
        'Mon, Wed, Fri',
        '10:00 AM',
        '12:00 PM',
        25,
        'Onsite / Online',
        'Lab 1 (Air-Conditioned)',
        'active'
      ]);

      db.run(`
        INSERT INTO batches (batch_code, name, course_id, instructor, start_date, end_date, days, start_time, end_time, max_students, mode, classroom, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        `${c.code}-B2`,
        `${c.name} - Session 02`,
        c.id,
        c.instructor || 'Lead Instructor',
        '2026-03-15',
        '2026-05-15',
        'Tue, Thu, Sat',
        '05:00 PM',
        '07:00 PM',
        30,
        'Onsite / Online',
        'Executive Hall',
        'active'
      ]);
    }
  }

  // Sanitize any existing batch names to remove Morning/Evening
  try {
    db.run(`
      UPDATE batches 
      SET name = REPLACE(REPLACE(REPLACE(REPLACE(name, ' - Morning Batch', ' - Session'), ' - Evening Batch', ' - Session'), 'Morning', 'Session'), 'Evening', 'Session')
      WHERE name LIKE '%Morning%' OR name LIKE '%Evening%';
    `);
  } catch (e) {
    // ignore
  }

  // Clean legacy dummy student names only if present (never wipe real user admissions or records)
  try {
    db.run("DELETE FROM students WHERE full_name IN ('Hassan Raza', 'Fatima Zahra', 'Ahmed Ali', 'Bilal Aslam', 'Zainab Bibi', 'Hamza Arshad', 'Ayesha Malik', 'Muhammad Ali', 'Fatima Noor', 'Usman Tariq') AND student_id LIKE 'DUMMY-%';");
  } catch (e) {
    // Non-blocking cleanup
  }

  // Seed Initial Audit Log
  const auditCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM audit_logs;');
  if (!auditCount || auditCount.c === 0) {
    db.run(`
      INSERT INTO audit_logs (user_id, user_name, user_role, action, module, record_id, details, ip) VALUES
      (1, 'CEO & Founder', 'owner', 'CREATE', 'system', 'SYSTEM_INIT', 'DigiSkool relational database tables, security schema, and course pricing initialized.', '127.0.0.1');
    `);
  }

  // Multi-Campus Sub-Accounts Migrations and Seeding
  try { db.run("ALTER TABLE users ADD COLUMN last_active_at TEXT;"); } catch(e){}
  try { db.run("ALTER TABLE sessions ADD COLUMN last_active_at TEXT;"); } catch(e){}
  try { db.run("ALTER TABLE accounts_transactions ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch(e){}
  try { db.run("ALTER TABLE accounts_transactions ADD COLUMN sub_account_id INTEGER;"); } catch(e){}
  try { db.run("ALTER TABLE accounts_transactions ADD COLUMN sub_account_name TEXT;"); } catch(e){}
  try { db.run("ALTER TABLE payments ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch(e){}
  try { db.run("ALTER TABLE payments ADD COLUMN sub_account_id INTEGER;"); } catch(e){}
  try { db.run("ALTER TABLE expenses ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch(e){}
  try { db.run("ALTER TABLE expenses ADD COLUMN sub_account_id INTEGER;"); } catch(e){}
  try { db.run("ALTER TABLE fee_vouchers ADD COLUMN campus TEXT DEFAULT 'Lahore';"); } catch(e){}

  // Clean out any old JazzCash, EasyPaisa, or Meezan Bank accounts
  try {
    db.run("DELETE FROM sub_accounts WHERE bank_name LIKE '%Meezan%' OR name LIKE '%JazzCash%' OR name LIKE '%EasyPaisa%' OR account_type = 'wallet';");
  } catch (e) {}

  const subAccountsCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM sub_accounts;');
  if (!subAccountsCount || subAccountsCount.c === 0) {
    db.run(`
      INSERT INTO sub_accounts (campus, name, code, account_type, bank_name, account_number, opening_balance, current_balance, is_active) VALUES
      ('Lahore', 'DigiSkool Lahore - Cash Desk', 'DSL-CASH', 'cash', NULL, 'NFC Phase 1 Window', 0, 0, 1),
      ('Lahore', 'DigiSkool - Bank Al Habib', 'DS-BAHL', 'bank', 'Bank Al Habib', '57270081000203018', 0, 0, 1),
      ('Lahore', 'DigiSkool - Bank Islami', 'DS-BKIP', 'bank', 'Bank Islami', '211100277400001', 0, 0, 1),
      ('Okara', 'DigiSkool Okara - Cash Counter', 'DSO-CASH', 'cash', NULL, 'Faisal Colony Okara Counter', 0, 0, 1),
      ('Okara', 'DigiSkool Okara - Bank Al Habib Desk', 'DSO-BAHL', 'bank', 'Bank Al Habib', '57270081000203018', 0, 0, 1),
      ('Okara', 'DigiSkool Okara - Bank Islami Desk', 'DSO-BKIP', 'bank', 'Bank Islami', '211100277400001', 0, 0, 1);
    `);
  }

  // Seed Official Staff Members matching the exact institutional roster & screenshot
  const officialStaffMembers = [
    { code: 'DGSL-EMP-001', name: 'Miss Bushra', designation: 'DM Trainer', dept: 'Digital Marketing', campus: 'Lahore Office', arrival: '9:00 AM', timeIn: '8:58 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSL-EMP-002', name: 'Miss Asma', designation: 'Admin HR', dept: 'Human Resources', campus: 'Lahore Office', arrival: '9:00 AM', timeIn: '', timeOut: '', remarks: 'Half Day Leave', status: 'leave' },
    { code: 'DGSL-EMP-003', name: 'Mahnoor Kamran', designation: 'SMM Expert', dept: 'Social Media', campus: 'Lahore Office', arrival: '9:00 AM', timeIn: '8:55 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSL-EMP-004', name: 'Esha Shahzadi', designation: 'SEO Team Lead', dept: 'SEO', campus: 'Lahore Office', arrival: '12:30 PM', timeIn: '', timeOut: '', remarks: '', status: 'not_reached' },
    { code: 'DGSL-EMP-005', name: 'Hasnaat Rao', designation: 'GMB Expert', dept: 'Digital Marketing', campus: 'Lahore Office', arrival: '2:30 PM', timeIn: '9:06 AM', timeOut: '', remarks: '', status: 'present' },
    { code: 'DGSL-EMP-006', name: 'Zaki Ibrar', designation: 'SMM Expert', dept: 'Social Media', campus: 'Lahore Office', arrival: '10:00 AM', timeIn: '', timeOut: '', remarks: '', status: 'not_reached' },
    { code: 'DGSL-EMP-007', name: 'Shakeel Ahmad', designation: 'Web Developer', dept: 'Development', campus: 'Lahore Office', arrival: '9:00 AM', timeIn: '8:50 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSL-EMP-008', name: 'M Waqas', designation: 'SEO Specialist', dept: 'SEO', campus: 'Lahore Office', arrival: '10:00 AM', timeIn: '8:50 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSL-EMP-009', name: 'Abdus Salam', designation: 'SMM Internee', dept: 'Social Media', campus: 'Lahore Office', arrival: '9:00 AM', timeIn: '', timeOut: '', remarks: 'NOT REACHED YET', status: 'not_reached' },
    { code: 'DGSL-EMP-010', name: 'M Imran', designation: 'Web Developer Internee', dept: 'Development', campus: 'Lahore Office', arrival: '9:30 AM', timeIn: '', timeOut: '', remarks: '', status: 'not_reached' },
    { code: 'DGSL-EMP-011', name: 'Shehroz Iftikhar', designation: 'SEO Internee', dept: 'SEO', campus: 'Lahore Office', arrival: '10:00 AM', timeIn: '', timeOut: '', remarks: '', status: 'not_reached' },
    { code: 'DGSL-EMP-012', name: 'Abdullah Bashir', designation: 'SEO Internee', dept: 'SEO', campus: 'Lahore Office', arrival: '9:30 AM', timeIn: '', timeOut: '', remarks: '', status: 'not_reached' },
    { code: 'DGSL-EMP-013', name: 'Ali Hussnain', designation: 'Office Boy', dept: 'Operations', campus: 'Lahore Office', arrival: '9:00 AM', timeIn: '8:30 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    // Okara Office Team
    { code: 'DGSO-EMP-001', name: 'Usman Khalid', designation: 'AI & Python Lead Instructor', dept: 'Academics', campus: 'Okara Office', arrival: '9:00 AM', timeIn: '8:55 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSO-EMP-002', name: 'Mariam Bibi', designation: 'Admission Counselor', dept: 'Admissions', campus: 'Okara Office', arrival: '9:00 AM', timeIn: '8:50 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSO-EMP-003', name: 'Farhan Ali', designation: 'Graphic Designer', dept: 'Design', campus: 'Okara Office', arrival: '10:00 AM', timeIn: '9:58 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSO-EMP-004', name: 'Zainab Noor', designation: 'SMM Specialist', dept: 'Marketing', campus: 'Okara Office', arrival: '9:30 AM', timeIn: '9:25 AM', timeOut: '05:00 PM', remarks: '', status: 'present' },
    { code: 'DGSO-EMP-005', name: 'Rashid Minhas', designation: 'Office Assistant', dept: 'Operations', campus: 'Okara Office', arrival: '8:30 AM', timeIn: '8:25 AM', timeOut: '05:00 PM', remarks: '', status: 'present' }
  ];

  // Insert or update staff members
  for (const emp of officialStaffMembers) {
    const existingStaff = queryOne<{ id: number }>('SELECT id FROM staff WHERE employee_code = ?;', [emp.code]);
    let sId = existingStaff?.id;
    if (!existingStaff) {
      const ins = runQuery(`
        INSERT INTO staff (employee_code, full_name, designation, department, campus, office_location, arrival_time, phone, email, joining_date, basic_salary, allowed_leaves, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, '0331-7155174', ?, '2025-01-01', 45000, 2, 'active');
      `, [emp.code, emp.name, emp.designation, emp.dept, emp.campus, emp.campus, emp.arrival, `${emp.code.toLowerCase()}@digiskool.pk`]);
      sId = Number(ins.lastInsertRowid);
    } else {
      runQuery(`
        UPDATE staff SET full_name = ?, designation = ?, department = ?, campus = ?, office_location = ?, arrival_time = ?
        WHERE id = ?;
      `, [emp.name, emp.designation, emp.dept, emp.campus, emp.campus, emp.arrival, sId]);
    }

    // Seed today's attendance for each staff member
    if (sId) {
      const today = new Date().toISOString().split('T')[0];
      const existingAtt = queryOne<{ id: number }>('SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?;', [sId, today]);
      if (!existingAtt) {
        runQuery(`
          INSERT INTO staff_attendance (staff_id, campus, date, status, arrival_time, time_in, time_out, check_in_time, check_out_time, late_minutes, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);
        `, [sId, emp.campus, today, emp.status, emp.arrival, emp.timeIn || null, emp.timeOut || null, emp.timeIn || null, emp.timeOut || null, emp.remarks || null]);
      }
    }
  }

  // Seed sample leave for Miss Asma
  const asmaStaff = queryOne<{ id: number }>('SELECT id FROM staff WHERE full_name LIKE "%Miss Asma%";');
  if (asmaStaff) {
    const leavesCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM staff_leaves WHERE staff_id = ?;', [asmaStaff.id]);
    if (!leavesCount || leavesCount.c === 0) {
      const today = new Date().toISOString().split('T')[0];
      runQuery(`
        INSERT INTO staff_leaves (staff_id, staff_name, designation, campus, leave_type, start_date, end_date, reason, status)
        VALUES (?, 'Miss Asma', 'Admin HR', 'Lahore Office', 'Half Day Leave', ?, ?, 'Personal appointment - afternoon half day approved', 'approved');
      `, [asmaStaff.id, today, today]);
    }
  }

  // Seed authentic initial students with official course-prefixed IDs (DM, OM, VE, GD, AI, WD)
  const studentCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM students;');
  if (!studentCount || studentCount.c === 0) {
    seedInitialStudentsAndVouchers(db);
  }
}

export function getCourseInitials(courseNameOrCode: string | undefined | null): string {
  if (!courseNameOrCode) return 'STD';
  const raw = String(courseNameOrCode).trim();
  const lower = raw.toLowerCase();

  // If already code like DS-DM, DS-OM, DS-VE, DS-GD, etc.
  const prefixMatch = raw.match(/^(?:DS-)?([A-Z]{2,4})$/i);
  if (prefixMatch) {
    const code = prefixMatch[1].toUpperCase();
    if (code === 'ADM' || code === 'DM') return 'DM';
    if (code === 'OM') return 'OM';
    if (code === 'VE') return 'VE';
    if (code === 'GD') return 'GD';
    if (code === 'WD' || code === 'WP') return 'WD';
    if (code === 'AI') return 'AI';
    if (code === 'SEO') return 'SEO';
    if (code === 'PPC' || code === 'SEM') return 'PPC';
    if (code === 'SMM') return 'SMM';
    if (code === 'SHP') return 'SHP';
    return code;
  }

  // Check specific course identifiers
  if (lower.includes('digital market') || /\b(adm|dm)\b/i.test(raw)) return 'DM';
  if (lower.includes('office manage') || /\bom\b/i.test(raw)) return 'OM';
  if (lower.includes('video edit') || /\bve\b/i.test(raw)) return 'VE';
  if (lower.includes('graphic design') || /\bgd\b/i.test(raw)) return 'GD';
  if (lower.includes('wordpress') || lower.includes('web develop') || /\b(wp|wd)\b/i.test(raw)) return 'WD';
  if (lower.includes('artificial intelligence') || /\bai\b/i.test(raw)) return 'AI';
  if (lower.includes('shopify') || lower.includes('e-commerce') || /\bshp\b/i.test(raw)) return 'SHP';
  if (lower.includes('social media') || /\bsmm\b/i.test(raw)) return 'SMM';
  if (lower.includes('seo') || lower.includes('search engine optimization')) return 'SEO';
  if (lower.includes('ppc') || lower.includes('google ads') || /\b(ppc|sem)\b/i.test(raw)) return 'PPC';

  const clean = lower.replace(/[^a-zA-Z\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const initials = words.map(w => w[0]?.toUpperCase()).join('');
  return initials.slice(0, 3) || 'STD';
}

export function getNextStudentId(coursePrefix: string): { student_id: string; registration_no: string } {
  const existingRows = queryAll<{ student_id: string }>(
    'SELECT student_id FROM students WHERE student_id LIKE ?;',
    [`DS-${coursePrefix}-%`]
  );
  let maxSeq = 0;
  for (const r of existingRows) {
    const parts = (r.student_id || '').split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }
  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  return {
    student_id: `DS-${coursePrefix}-${seqStr}`,
    registration_no: `REG-2026-${coursePrefix}-${seqStr}`
  };
}

function seedInitialStudentsAndVouchers(db: Database) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const secondDueDate = new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0];

  const initialStudents = [
    {
      student_id: 'DS-DM-0001',
      reg_no: 'REG-2026-DM-0001',
      name: 'Muhammad Hamza',
      father: 'Hamza Farooq Sr.',
      phone: '0300-1234567',
      whatsapp: '0300-1234567',
      email: 'hamza.dm@digiskool.pk',
      gender: 'Male',
      marital: 'Single',
      qualification: 'BBA / Marketing',
      city: 'Lahore',
      campus: 'Lahore Campus',
      course_code: 'DS-ADM',
      plan: 'installments',
      fee: 40000,
      paid: 20000,
      remaining: 20000
    },
    {
      student_id: 'DS-DM-0002',
      reg_no: 'REG-2026-DM-0002',
      name: 'Ayesha Noor',
      father: 'Noor Muhammad',
      phone: '0310-4367347',
      whatsapp: '0310-4367347',
      email: 'ayesha.dm@digiskool.pk',
      gender: 'Female',
      marital: 'Single',
      qualification: 'BS Computer Science',
      city: 'Okara',
      campus: 'Okara Campus',
      course_code: 'DS-ADM',
      plan: 'installments',
      fee: 40000,
      paid: 20000,
      remaining: 20000
    },
    {
      student_id: 'DS-OM-0001',
      reg_no: 'REG-2026-OM-0001',
      name: 'Bilal Ahmed',
      father: 'Ahmed Raza',
      phone: '0321-7654321',
      whatsapp: '0321-7654321',
      email: 'bilal.om@digiskool.pk',
      gender: 'Male',
      marital: 'Single',
      qualification: 'Intermediate (ICS)',
      city: 'Lahore',
      campus: 'Lahore Campus',
      course_code: 'DS-OM',
      plan: 'full',
      fee: 20000,
      paid: 20000,
      remaining: 0
    },
    {
      student_id: 'DS-OM-0002',
      reg_no: 'REG-2026-OM-0002',
      name: 'Sana Fatima',
      father: 'Tariq Mehmood',
      phone: '0312-9876543',
      whatsapp: '0312-9876543',
      email: 'sana.om@digiskool.pk',
      gender: 'Female',
      marital: 'Single',
      qualification: 'BA Graduate',
      city: 'Okara',
      campus: 'Okara Campus',
      course_code: 'DS-OM',
      plan: 'installments',
      fee: 20000,
      paid: 10000,
      remaining: 10000
    },
    {
      student_id: 'DS-VE-0001',
      reg_no: 'REG-2026-VE-0001',
      name: 'Usman Ali',
      father: 'Muhammad Ali',
      phone: '0333-8889991',
      whatsapp: '0333-8889991',
      email: 'usman.ve@digiskool.pk',
      gender: 'Male',
      marital: 'Single',
      qualification: 'BS Media Studies',
      city: 'Lahore',
      campus: 'Lahore Campus',
      course_code: 'DS-VE',
      plan: 'installments',
      fee: 25000,
      paid: 12500,
      remaining: 12500
    },
    {
      student_id: 'DS-VE-0002',
      reg_no: 'REG-2026-VE-0002',
      name: 'Zainab Tariq',
      father: 'Tariq Hussain',
      phone: '0314-5556667',
      whatsapp: '0314-5556667',
      email: 'zainab.ve@digiskool.pk',
      gender: 'Female',
      marital: 'Single',
      qualification: 'Graphic & Media Diploma',
      city: 'Okara',
      campus: 'Okara Campus',
      course_code: 'DS-VE',
      plan: 'installments',
      fee: 25000,
      paid: 12500,
      remaining: 12500
    },
    {
      student_id: 'DS-GD-0001',
      reg_no: 'REG-2026-GD-0001',
      name: 'Ali Raza',
      father: 'Ghulam Raza',
      phone: '0304-1112233',
      whatsapp: '0304-1112233',
      email: 'ali.gd@digiskool.pk',
      gender: 'Male',
      marital: 'Single',
      qualification: 'Fine Arts Student',
      city: 'Lahore',
      campus: 'Lahore Campus',
      course_code: 'DS-GD',
      plan: 'full',
      fee: 25000,
      paid: 25000,
      remaining: 0
    },
    {
      student_id: 'DS-AI-0001',
      reg_no: 'REG-2026-AI-0001',
      name: 'Dr. Kamran Khan',
      father: 'Khan Muhammad',
      phone: '0301-4445566',
      whatsapp: '0301-4445566',
      email: 'kamran.ai@digiskool.pk',
      gender: 'Male',
      marital: 'Married',
      qualification: 'PhD / Senior Researcher',
      city: 'Lahore',
      campus: 'Lahore Campus',
      course_code: 'DS-AI',
      plan: 'full',
      fee: 25000,
      paid: 25000,
      remaining: 0
    },
    {
      student_id: 'DS-WD-0001',
      reg_no: 'REG-2026-WD-0001',
      name: 'Hassan Mehmood',
      father: 'Mehmood Akhtar',
      phone: '0315-7778899',
      whatsapp: '0315-7778899',
      email: 'hassan.wd@digiskool.pk',
      gender: 'Male',
      marital: 'Single',
      qualification: 'BS Information Technology',
      city: 'Okara',
      campus: 'Okara Campus',
      course_code: 'DS-WP',
      plan: 'installments',
      fee: 25000,
      paid: 15000,
      remaining: 10000
    }
  ];

  let vchIndex = 1;
  let rctIndex = 1;
  let admIndex = 1;

  for (const s of initialStudents) {
    const course = queryOne<{ id: number; name: string; fee: number }>('SELECT id, name, fee FROM courses WHERE code = ?;', [s.course_code]);
    if (!course) continue;

    const batch = queryOne<{ id: number }>('SELECT id FROM batches WHERE course_id = ? LIMIT 1;', [course.id]);
    const batchId = batch ? batch.id : 1;

    // 1. Insert Student
    const stdRes = runQuery(`
      INSERT INTO students (
        student_id, registration_no, full_name, father_name, guardian_name, phone, whatsapp,
        email, cnic_bform, date_of_birth, gender, marital_status, nationality, qualification,
        address, city, status, admission_date, campus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '35201-1234567-1', '2001-05-15', ?, ?, 'Pakistani', ?, ?, ?, 'active', ?, ?);
    `, [
      s.student_id, s.reg_no, s.name, s.father, s.father, s.phone, s.whatsapp,
      s.email, s.gender, s.marital, s.qualification, `${s.city}, Pakistan`, s.city, todayStr, s.campus
    ]);
    const studentDbId = stdRes.lastInsertRowid;

    // 2. Insert Admission
    const admNo = `DS-ADM-${String(admIndex++).padStart(4, '0')}`;
    const admRes = runQuery(`
      INSERT INTO admissions (
        admission_no, student_id, course_id, batch_id, admission_date, course_fee, discount,
        final_payable, payment_plan, initial_payment, notes, status, created_by, campus,
        second_installment_due_date, second_installment_amount
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'confirmed', 1, ?, ?, ?);
    `, [
      admNo, studentDbId, course.id, batchId, todayStr, s.fee, s.fee,
      s.plan, s.paid, `Official admission for ${s.name}`, s.campus,
      s.plan === 'installments' ? secondDueDate : null,
      s.plan === 'installments' ? s.remaining : 0
    ]);
    const admissionId = admRes.lastInsertRowid;

    // 3. Insert Enrollment
    const enrollRes = runQuery(`
      INSERT INTO enrollments (
        student_id, course_id, batch_id, admission_id, enrollment_date, course_fee, discount,
        final_fee, paid_amount, remaining_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'active');
    `, [
      studentDbId, course.id, batchId, admissionId, todayStr, s.fee, s.fee, s.paid, s.remaining
    ]);
    const enrollmentId = enrollRes.lastInsertRowid;

    // 4. Voucher 1 (1st Installment or Full Fee)
    const vchNo1 = `DS-VCH-${String(vchIndex++).padStart(4, '0')}-01`;
    const vch1Status = s.paid >= s.fee ? 'paid' : (s.paid > 0 ? (s.plan === 'installments' ? 'paid' : 'partial') : 'unpaid');
    const vch1Amount = s.plan === 'installments' ? s.paid : s.fee;
    const rctNo1 = s.paid > 0 ? `DS-RCT-${String(rctIndex++).padStart(4, '0')}` : null;

    const vch1Res = runQuery(`
      INSERT INTO fee_vouchers (
        voucher_no, student_id, enrollment_id, course_id, batch_id, issue_date, due_date,
        fee_description, amount, discount, late_fee, total_payable, paid_amount, status,
        installment_no, created_by, campus, second_installment_due_date, second_installment_amount,
        receipt_no, payment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?);
    `, [
      vchNo1, studentDbId, enrollmentId, course.id, batchId, todayStr, todayStr,
      s.plan === 'installments' ? `Installment 1 of 2 - ${course.name}` : `Course Tuition Fee - ${course.name}`,
      vch1Amount, vch1Amount, s.paid, vch1Status, s.campus,
      s.plan === 'installments' ? secondDueDate : null,
      s.plan === 'installments' ? s.remaining : 0,
      rctNo1, s.paid > 0 ? todayStr : null
    ]);
    const voucher1Id = vch1Res.lastInsertRowid;

    // Payment for 1st installment
    if (s.paid > 0 && rctNo1) {
      runQuery(`
        INSERT INTO payments (
          receipt_no, voucher_id, student_id, amount, payment_date, payment_method,
          transaction_ref, received_by, status, notes, campus
        ) VALUES (?, ?, ?, ?, ?, 'Bank Al Habib', ?, 1, 'valid', 'Initial enrollment fee collection', ?);
      `, [rctNo1, voucher1Id, studentDbId, s.paid, todayStr, `ADM-${admNo}`, s.campus]);

      runQuery(`
        INSERT INTO accounts_transactions (trx_date, type, account_type, amount, category, reference_id, description, status, campus)
        VALUES (?, 'income', 'bank', ?, 'Fee Collection', ?, ?, 'valid', ?);
      `, [todayStr, s.paid, rctNo1, `Fee collection from ${s.name} (${course.name})`, s.campus.includes('Okara') ? 'Okara' : 'Lahore']);
    }

    // 5. Voucher 2 (if installments)
    if (s.plan === 'installments') {
      const vchNo2 = `DS-VCH-${String(vchIndex++).padStart(4, '0')}-02`;
      runQuery(`
        INSERT INTO fee_vouchers (
          voucher_no, student_id, enrollment_id, course_id, batch_id, issue_date, due_date,
          fee_description, amount, discount, late_fee, total_payable, paid_amount, status,
          installment_no, created_by, campus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 'unpaid', 2, 1, ?);
      `, [
        vchNo2, studentDbId, enrollmentId, course.id, batchId, todayStr, secondDueDate,
        `Installment 2 of 2 - ${course.name}`, s.remaining, s.remaining, s.campus
      ]);

      // Reminder notification
      runQuery(`
        INSERT INTO notifications (title, message, type, related_module, related_id)
        VALUES (?, ?, 'warning', 'vouchers', ?);
      `, [
        `2nd Installment Due: ${s.name}`,
        `Upcoming 2nd installment for ${s.name} (${course.name}) is due on ${secondDueDate}. Amount: Rs. ${s.remaining.toLocaleString()}`,
        vchNo2
      ]);
    }
  }

  saveDb();
}
