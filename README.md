# DigiSkool - Institute of Digital Skills Management System

Official institutional portal and ERP system for **DigiSkool - Institute of Digital Skills** (Lahore & Okara Campuses).

## Features

- **Role-Based Access Control (RBAC)**: Master Admin, Principal, Admin/HR, Faculty/Teacher, and Student roles.
- **Campuses**: Multi-campus support for Lahore (DGSL) and Okara (DGSO).
- **Admissions Management**: Online admission intake form with automated student ID generation.
- **Course & Batch Scheduling**: Timetable management, faculty assignment, and enrolled student rosters.
- **Financial Accounting & Fee Vouchers**: 3-part bank fee vouchers (Student, Bank, Institute copies) and official cash receipts.
- **Audit Logging**: Comprehensive activity logs for all critical changes.
- **Data Export & Backups**: One-click JSON backup export for safekeeping student and financial records.
- **Dark/Light Mode**: Persisted theme preferences with high-contrast document print preservation.

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Express.js server, Node.js, Better-SQLite3 / SQLite persistence
- **Build**: Vite + esbuild

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 3. Production Build
```bash
npm run build
npm start
```

## Subdomain Deployment (`myportal.digiskool.pk`)

To host on your cPanel subdomain:
1. Run `npm run build` to output production assets into `dist/`.
2. Upload the files inside `dist/` to `/public_html/myportal.digiskool.pk/`.
3. Add a standard Single Page Application `.htaccess` rewrite rule to redirect all routes to `index.html`.

---
Managed & Maintained by **DigiSkool Institute of Digital Skills**.
