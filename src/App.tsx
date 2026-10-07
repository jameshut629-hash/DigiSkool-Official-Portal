import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { CampusProvider } from './context/CampusContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { LoginView } from './components/auth/LoginView.tsx';

// Views
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { StudentsView } from './components/students/StudentsView.tsx';
import { AdmissionsView } from './components/admissions/AdmissionsView.tsx';
import { CoursesView } from './components/courses/CoursesView.tsx';
import { FeeVouchersView } from './components/fees/FeeVouchersView.tsx';
import { PaymentsView } from './components/fees/PaymentsView.tsx';
import { ExpensesView } from './components/expenses/ExpensesView.tsx';
import { AccountsView } from './components/accounts/AccountsView.tsx';
import { RemindersView } from './components/reminders/RemindersView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { SecurityView } from './components/security/SecurityView.tsx';
import { ActivityLogView } from './components/security/ActivityLogView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { StaffView } from './components/staff/StaffView.tsx';

// Common Printable Modals
import { PrintVoucherModal } from './components/common/PrintVoucherModal.tsx';
import { PrintReceiptModal } from './components/common/PrintReceiptModal.tsx';
import { PrintExpenseVoucherModal } from './components/common/PrintExpenseVoucherModal.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { StudentQrScannerModal } from './components/students/StudentQrScannerModal.tsx';
import { StudentIdCardModal } from './components/students/StudentIdCardModal.tsx';
import { SupportChatWidget } from './components/common/SupportChatWidget.tsx';

const VALID_TABS = [
  'dashboard', 'students', 'admissions', 'courses', 'vouchers',
  'payments', 'expenses', 'accounts', 'reminders', 'staff',
  'reports', 'security', 'activity-log', 'settings'
];

function getTabFromPath(pathname: string): string {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean || clean === 'login' || clean === 'portal') return 'dashboard';
  if (VALID_TABS.includes(clean)) return clean;
  if (clean === 'student' || clean === 'directory') return 'students';
  if (clean === 'admission') return 'admissions';
  if (clean === 'voucher' || clean === 'fee-vouchers' || clean === 'fee_vouchers') return 'vouchers';
  if (clean === 'payment' || clean === 'receipts') return 'payments';
  if (clean === 'expense') return 'expenses';
  if (clean === 'account' || clean === 'ledger') return 'accounts';
  if (clean === 'reminder') return 'reminders';
  if (clean === 'staff-attendance' || clean === 'attendance') return 'staff';
  if (clean === 'report' || clean === 'analytics') return 'reports';
  if (clean === 'security-users' || clean === 'users') return 'security';
  if (clean === 'activity' || clean === 'audit') return 'activity-log';
  if (clean === 'setting') return 'settings';
  return 'dashboard';
}

function getPathForTab(tab: string): string {
  if (tab === 'dashboard') return '/dashboard';
  return `/${tab}`;
}

const AppContent: React.FC = () => {
  const { user, loading, canAccessModule } = useAuth();
  const { theme } = useTheme();
  const [currentTab, setCurrentTab] = useState<string>(() => {
    return getTabFromPath(window.location.pathname);
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigateToTab = (newTab: string) => {
    setCurrentTab(newTab);
    const targetPath = getPathForTab(newTab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: newTab }, '', targetPath + window.location.search);
    }
  };

  // Popstate listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setCurrentTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Printable Modals
  const [printableVoucherId, setPrintableVoucherId] = useState<number | null>(null);
  const [printableReceiptId, setPrintableReceiptId] = useState<number | null>(null);
  const [printableExpenseId, setPrintableExpenseId] = useState<number | null>(null);

  // Global Student QR Scanner & ID Card State
  const [globalScannerOpen, setGlobalScannerOpen] = useState(false);
  const [globalIdCardStudent, setGlobalIdCardStudent] = useState<any | null>(null);

  // Check URL parameters for direct printable modals
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pv = params.get('print_voucher');
      if (pv && !isNaN(Number(pv))) setPrintableVoucherId(Number(pv));
      const pr = params.get('print_receipt');
      if (pr && !isNaN(Number(pr))) setPrintableReceiptId(Number(pr));
      const pe = params.get('print_expense');
      if (pe && !isNaN(Number(pe))) setPrintableExpenseId(Number(pe));
    } catch {
      // ignore
    }
  }, []);

  // Synchronize browser URL bar between /login and the current tab route
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // When not logged in, set URL path to /login
      if (window.location.pathname !== '/login') {
        window.history.replaceState({ tab: 'login' }, '', '/login' + window.location.search);
      }
    } else {
      // When logged in, ensure URL path matches active tab
      const expectedPath = getPathForTab(currentTab);
      if (window.location.pathname === '/login' || window.location.pathname === '/' || window.location.pathname !== expectedPath) {
        window.history.replaceState({ tab: currentTab }, '', expectedPath + window.location.search);
      }
    }
  }, [user, loading, currentTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center">
          <div className="p-6 sm:p-8 bg-white rounded-3xl shadow-2xl flex items-center justify-center border border-slate-100">
            <img src="/digiskool-logo.png" alt="DigiSkool" className="h-16 sm:h-20 w-auto object-contain select-none" />
          </div>
          <div className="flex items-center gap-2.5 mt-5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#6E1231] animate-ping" />
            <p className="text-xs font-semibold tracking-widest uppercase">
              DigiSkool Lahore & Okara • 0331-7155174
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col transition-colors duration-200`}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={navigateToTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={navigateToTab}
          onOpenScanner={() => setGlobalScannerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            {/* Permission Guard: Check if current active user has access to this module */}
            {!canAccessModule(currentTab) ? (
              <div className="bg-white rounded-3xl border border-rose-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
                <div className="w-16 h-16 bg-rose-50 text-[#6E1231] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  Access Restricted
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
                  Aapko is module (<strong>{currentTab.toUpperCase()}</strong>) ki access nahi di gayi hai. Agar aapko is section ki zaroorat hai toh baraye mehrbani Main Admin se rabta karein.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => navigateToTab('dashboard')}
                    className="px-5 py-2.5 bg-[#6E1231] hover:bg-[#85173A] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                  <a
                    href="mailto:adnanmrao@gmail.com"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Contact Admin (Adnan Rao)
                  </a>
                </div>
              </div>
            ) : (
              <>
                {currentTab === 'dashboard' && (
                  <DashboardView
                    onNavigate={navigateToTab}
                    onOpenPrintVoucher={(id) => setPrintableVoucherId(id)}
                    onOpenPrintReceipt={(id) => setPrintableReceiptId(id)}
                    onOpenQrScanner={() => setGlobalScannerOpen(true)}
                  />
                )}

                {currentTab === 'students' && (
                  <StudentsView
                    onOpenPrintVoucher={(id) => setPrintableVoucherId(id)}
                    onOpenPrintReceipt={(id) => setPrintableReceiptId(id)}
                  />
                )}

                {currentTab === 'admissions' && (
                  <AdmissionsView
                    onOpenPrintVoucher={(id) => setPrintableVoucherId(id)}
                    onOpenPrintReceipt={(id) => setPrintableReceiptId(id)}
                  />
                )}

                {currentTab === 'courses' && <CoursesView />}

                {currentTab === 'vouchers' && (
                  <FeeVouchersView
                    onOpenPrintVoucher={(id) => setPrintableVoucherId(id)}
                    onNavigateToPayments={() => navigateToTab('payments')}
                  />
                )}

                {currentTab === 'payments' && (
                  <PaymentsView
                    onOpenPrintReceipt={(id) => setPrintableReceiptId(id)}
                  />
                )}

                {currentTab === 'expenses' && (
                  <ExpensesView
                    onOpenPrintExpenseVoucher={(id) => setPrintableExpenseId(id)}
                  />
                )}

                {currentTab === 'accounts' && <AccountsView />}

                {currentTab === 'reminders' && <RemindersView />}

                {currentTab === 'staff' && <StaffView />}

                {currentTab === 'reports' && <ReportsView />}

                {currentTab === 'security' && <SecurityView />}

                {currentTab === 'activity-log' && <ActivityLogView />}

                {currentTab === 'settings' && <SettingsView />}
              </>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Print & Download Modals */}
      {printableVoucherId && (
        <PrintVoucherModal
          voucherId={printableVoucherId}
          onClose={() => setPrintableVoucherId(null)}
        />
      )}

      {printableReceiptId && (
        <PrintReceiptModal
          paymentId={printableReceiptId}
          onClose={() => setPrintableReceiptId(null)}
        />
      )}

      {printableExpenseId && (
        <PrintExpenseVoucherModal
          expenseId={printableExpenseId}
          onClose={() => setPrintableExpenseId(null)}
        />
      )}

      {/* Global Student QR Code Scanner Modal */}
      {globalScannerOpen && (
        <StudentQrScannerModal
          isOpen={globalScannerOpen}
          onClose={() => setGlobalScannerOpen(false)}
          onViewStudentDetails={(id) => {
            navigateToTab('students');
            setGlobalScannerOpen(false);
          }}
          onOpenPrintVoucher={(vid) => {
            setPrintableVoucherId(vid);
            setGlobalScannerOpen(false);
          }}
          onOpenPrintIdCard={(std) => {
            setGlobalIdCardStudent(std);
            setGlobalScannerOpen(false);
          }}
        />
      )}

      {/* Global Student ID Card & QR Preview Modal */}
      {globalIdCardStudent && (
        <StudentIdCardModal
          student={globalIdCardStudent}
          isOpen={!!globalIdCardStudent}
          onClose={() => setGlobalIdCardStudent(null)}
          onOpenScanner={() => setGlobalScannerOpen(true)}
        />
      )}

      {/* Floating Support Chat & Assistance Desk */}
      <SupportChatWidget />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CampusProvider>
          <AppContent />
        </CampusProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
