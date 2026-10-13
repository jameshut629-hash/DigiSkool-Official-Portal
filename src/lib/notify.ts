/**
 * Universal Toast & Notification System for DigiSkool
 * Replaces window.alert to prevent iframe sandbox errors and frozen buttons
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function showToast(message: string, type: ToastType = 'info', duration: number = 4000) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('digiskool:toast', {
    detail: {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      message: String(message || ''),
      type,
      duration
    }
  });
  window.dispatchEvent(event);
}

// Global safe alert replacement that dispatches a toast instead of window.alert
export function safeAlert(message: string, type: ToastType = 'error') {
  showToast(message, type, 4500);
}
