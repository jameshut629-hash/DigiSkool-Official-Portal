// src/db/schema.ts
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Users table (maps to Firebase Auth UID & system users)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('staff'),
  campusAccess: text('campus_access').notNull().default('all'),
  permissionLevel: text('permission_level').notNull().default('selective'),
  allowedModules: text('allowed_modules').default('all'),
  status: text('status').notNull().default('active'),
  phone: text('phone'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// System Settings
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  instituteName: text('institute_name').notNull().default('DigiSkool-Institute of Digital Skills'),
  instituteSubtitle: text('institute_subtitle').default('Institute of Digital Skills'),
  campuses: text('campuses').default('Lahore & Okara'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  currency: text('currency').default('PKR'),
  currencySymbol: text('currency_symbol').default('Rs.'),
  voucherPrefix: text('voucher_prefix').default('DS-VCH-'),
  receiptPrefix: text('receipt_prefix').default('DS-RCT-'),
  expensePrefix: text('expense_prefix').default('DS-EXP-'),
  admissionPrefix: text('admission_prefix').default('DS-ADM-'),
  alertEmail: text('alert_email').default('jameshut629@gmail.com'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Campuses table
export const campuses = pgTable('campuses', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Courses table
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  category: text('category').default('Technology'),
  durationMonths: integer('duration_months').default(3),
  totalFee: integer('total_fee').notNull(),
  admissionFee: integer('admission_fee').default(0),
  syllabus: text('syllabus'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Batches table
export const batches = pgTable('batches', {
  id: serial('id').primaryKey(),
  batchCode: text('batch_code').notNull().unique(),
  courseId: integer('course_id').references(() => courses.id),
  campusId: integer('campus_id').references(() => campuses.id),
  startDate: text('start_date'),
  endDate: text('end_date'),
  timing: text('timing'),
  maxStudents: integer('max_students').default(30),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Students table
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  regNo: text('reg_no').notNull().unique(),
  name: text('name').notNull(),
  fatherName: text('father_name'),
  cnic: text('cnic'),
  phone: text('phone').notNull(),
  email: text('email'),
  guardianPhone: text('guardian_phone'),
  address: text('address'),
  city: text('city'),
  campusId: integer('campus_id').references(() => campuses.id),
  currentCourseId: integer('current_course_id').references(() => courses.id),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Admissions table
export const admissions = pgTable('admissions', {
  id: serial('id').primaryKey(),
  admissionNo: text('admission_no').notNull().unique(),
  studentId: integer('student_id').references(() => students.id),
  courseId: integer('course_id').references(() => courses.id),
  campusId: integer('campus_id').references(() => campuses.id),
  batchId: integer('batch_id').references(() => batches.id),
  admissionDate: text('admission_date').notNull(),
  agreedFee: integer('agreed_fee').notNull(),
  discountAmount: integer('discount_amount').default(0),
  paymentPlan: text('payment_plan').default('installments'),
  status: text('status').default('admitted'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Fee Vouchers table
export const feeVouchers = pgTable('fee_vouchers', {
  id: serial('id').primaryKey(),
  voucherNo: text('voucher_no').notNull().unique(),
  studentId: integer('student_id').references(() => students.id),
  admissionId: integer('admission_id').references(() => admissions.id),
  courseId: integer('course_id').references(() => courses.id),
  campusId: integer('campus_id').references(() => campuses.id),
  amount: integer('amount').notNull(),
  dueDate: text('due_date').notNull(),
  installmentNo: integer('installment_no').default(1),
  status: text('status').default('unpaid'), // unpaid, paid, partial, cancelled
  paidAmount: integer('paid_amount').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Fee Payments (Receipts)
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  receiptNo: text('receipt_no').notNull().unique(),
  voucherId: integer('voucher_id').references(() => feeVouchers.id),
  studentId: integer('student_id').references(() => students.id),
  campusId: integer('campus_id').references(() => campuses.id),
  amount: integer('amount').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method').default('cash'),
  referenceNo: text('reference_no'),
  receivedBy: text('received_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Expenses table
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseNo: text('expense_no').notNull().unique(),
  campusId: integer('campus_id').references(() => campuses.id),
  category: text('category').notNull(),
  title: text('title').notNull(),
  amount: integer('amount').notNull(),
  expenseDate: text('expense_date').notNull(),
  paidTo: text('paid_to'),
  paymentMethod: text('payment_method').default('cash'),
  approvedBy: text('approved_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit / Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  userEmail: text('user_email'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Drizzle Relations
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  campus: one(campuses, {
    fields: [students.campusId],
    references: [campuses.id],
  }),
  course: one(courses, {
    fields: [students.currentCourseId],
    references: [courses.id],
  }),
  admissions: many(admissions),
  vouchers: many(feeVouchers),
  payments: many(payments),
}));

export const feeVouchersRelations = relations(feeVouchers, ({ one, many }) => ({
  student: one(students, {
    fields: [feeVouchers.studentId],
    references: [students.id],
  }),
  payments: many(payments),
}));
