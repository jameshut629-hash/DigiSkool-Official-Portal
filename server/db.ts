import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { SQL_WASM_BASE64 } from './sqlWasmBase64.ts';

let dbInstance: Database | null = null;
let DATA_DIR = path.join(process.cwd(), 'data');
let DB_FILE = path.join(DATA_DIR, 'digiskool.sqlite');

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

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  initSchemaAndSeed(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
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
      email TEXT NOT NULL DEFAULT 'info@digiskool.pk',
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
        'info@digiskool.pk',
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

  // Populate campus assignments for realistic Lahore and Okara campus data
  try {
    db.run(`
      UPDATE students 
      SET campus = 'Okara' 
      WHERE LOWER(COALESCE(city, '')) LIKE '%okara%' 
         OR student_id LIKE '%-0002' OR student_id LIKE '%-0004' OR student_id LIKE '%-0006' 
         OR student_id LIKE '%-0008' OR student_id LIKE '%-0010' OR student_id LIKE '%-0012' 
         OR student_id LIKE '%-0014' OR student_id LIKE '%-0016' OR student_id LIKE '%-0018' 
         OR student_id LIKE '%-0020';
    `);
    db.run(`UPDATE students SET campus = 'Lahore' WHERE campus IS NULL OR campus = '' OR campus != 'Okara';`);
    db.run(`UPDATE admissions SET campus = (SELECT COALESCE(s.campus, 'Lahore') FROM students s WHERE s.id = admissions.student_id);`);
    db.run(`UPDATE batches SET campus = CASE WHEN id % 2 = 0 THEN 'Okara' ELSE 'Lahore' END WHERE campus IS NULL OR campus = '';`);
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

  // The institutional portal must have ONLY ONE user: adnanmrao@gmail.com (as strictly requested)
  // Ensure adnanmrao@gmail.com exists first
  let adnanUser = queryOne<{ id: number }>('SELECT id FROM users WHERE LOWER(email) = "adnanmrao@gmail.com";');
  if (!adnanUser) {
    db.run(`
      INSERT INTO users (name, email, password_hash, role, permission_level, campus_access, allowed_modules, phone, status)
      VALUES ('Adnan Rao (Main Admin)', 'adnanmrao@gmail.com', ?, 'owner', 'full', 'all', 'all', '0331-7155-174', 'active');
    `, [defaultPasswordHash]);
    adnanUser = queryOne<{ id: number }>('SELECT id FROM users WHERE LOWER(email) = "adnanmrao@gmail.com";');
  } else {
    db.run(`
      UPDATE users SET name = 'Adnan Rao (Main Admin)', role = 'owner', permission_level = 'full', campus_access = 'all', allowed_modules = 'all', status = 'active'
      WHERE id = ?;
    `, [adnanUser.id]);
  }

  // Safely reassign foreign keys to adnanmrao and delete all other users
  if (adnanUser) {
    try {
      const targetId = adnanUser.id;
      db.run('PRAGMA foreign_keys = OFF;');
      db.run('UPDATE admissions SET created_by = ? WHERE created_by != ?;', [targetId, targetId]);
      db.run('UPDATE fee_vouchers SET created_by = ? WHERE created_by != ?;', [targetId, targetId]);
      db.run('UPDATE payments SET received_by = ? WHERE received_by IS NOT NULL AND received_by != ?;', [targetId, targetId]);
      db.run('UPDATE payments SET voided_by = ? WHERE voided_by IS NOT NULL AND voided_by != ?;', [targetId, targetId]);
      db.run('UPDATE expenses SET created_by = ? WHERE created_by != ?;', [targetId, targetId]);
      db.run('UPDATE expenses SET approved_by = ? WHERE approved_by IS NOT NULL AND approved_by != ?;', [targetId, targetId]);
      db.run('UPDATE expenses SET voided_by = ? WHERE voided_by IS NOT NULL AND voided_by != ?;', [targetId, targetId]);
      db.run('UPDATE audit_logs SET user_id = ? WHERE user_id != ?;', [targetId, targetId]);
      db.run('UPDATE login_logs SET user_id = ? WHERE user_id IS NOT NULL AND user_id != ?;', [targetId, targetId]);
      db.run('DELETE FROM sessions WHERE user_id != ?;', [targetId]);
      db.run('DELETE FROM users WHERE id != ?;', [targetId]);
      db.run('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.error('Error cleaning non-adnanmrao users:', e);
      db.run('PRAGMA foreign_keys = ON;');
    }
  }

  // Remove any dummy student user account
  db.run('DELETE FROM users WHERE LOWER(email) = "student@digiskool.pk" OR role = "student";');

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
}
