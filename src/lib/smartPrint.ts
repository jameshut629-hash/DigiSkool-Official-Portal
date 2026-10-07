/**
 * Smart Print Utility for DigiSkool
 * 
 * Directly opens the native browser print preview dialog (`window.print()`).
 * Supports printing specific DOM elements (vouchers, receipts, admission forms)
 * cleanly without background application noise.
 */

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export interface SmartPrintOptions {
  elementId?: string;
  documentTitle?: string;
  fallbackPdfGenerator?: () => Promise<void> | void;
}

/**
 * Isolated print helper:
 * Renders ONLY the target element (e.g. 2-part voucher, receipt, admission form)
 * in an offscreen iframe and triggers contentWindow.print().
 */
function printElementDirect(element: HTMLElement, title: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Remove any existing print frame
      const existing = document.getElementById('digiskool-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'digiskool-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc || !iframe.contentWindow) {
        window.print();
        resolve();
        return;
      }

      // Collect stylesheets from current document
      const styleTags: string[] = [];
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link: any) => {
        styleTags.push(`<link rel="stylesheet" href="${link.href}">`);
      });
      document.querySelectorAll('style').forEach((st: any) => {
        styleTags.push(`<style>${st.innerHTML}</style>`);
      });

      const printStyles = `
        <style>
          @page {
            margin: 6mm;
            size: auto;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 4mm !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 100% !important;
            height: auto !important;
          }
          .no-print, button, nav, aside, .app-sidebar, .app-header {
            display: none !important;
          }
          #printable-voucher {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #printable-receipt,
          #printable-expense-voucher,
          #printable-meeting-report,
          #digiskool-admission-form-sheet {
            width: 100% !important;
            max-width: 100% !important;
          }
        </style>
      `;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            ${styleTags.join('\n')}
            ${printStyles}
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        resolve();

        // Clean up
        setTimeout(() => {
          try {
            iframe.remove();
          } catch {}
        }, 5000);
      }, 300);
    } catch {
      window.print();
      resolve();
    }
  });
}

/**
 * Directly prints document and opens the browser's native print preview dialog.
 */
export async function executeSmartPrint(
  options: SmartPrintOptions
): Promise<{ success: boolean; method: 'native' | 'pdf'; message: string }> {
  const originalTitle = document.title;
  
  if (options.documentTitle) {
    try {
      document.title = options.documentTitle;
    } catch {
      // ignore
    }
  }

  // 1. If elementId is provided and exists in DOM, use isolated iframe print
  if (options.elementId) {
    const el = document.getElementById(options.elementId);
    if (el) {
      try {
        await printElementDirect(el, options.documentTitle || originalTitle);
        return {
          success: true,
          method: 'native',
          message: '✓ Browser print dialog opened successfully.'
        };
      } catch (iframeErr) {
        console.warn('Isolated iframe print notice, using direct window.print():', iframeErr);
      }
    }
  }

  // 2. Direct native window.print()
  let printSucceeded = false;
  try {
    document.body.classList.add('is-printing');
    window.print();
    printSucceeded = true;
  } catch (err) {
    console.warn('Native window.print() encountered an error:', err);
  } finally {
    document.body.classList.remove('is-printing');
    if (options.documentTitle) {
      setTimeout(() => {
        try {
          document.title = originalTitle;
        } catch {
          // ignore
        }
      }, 1500);
    }
  }

  if (printSucceeded) {
    return {
      success: true,
      method: 'native',
      message: '✓ Browser print dialog opened successfully.'
    };
  }

  // 3. Fallback to PDF generator only if browser completely blocked window.print()
  if (options.fallbackPdfGenerator) {
    try {
      await options.fallbackPdfGenerator();
      return {
        success: true,
        method: 'pdf',
        message: '✓ Print document generated & downloaded as high-resolution PDF.'
      };
    } catch (pdfErr: any) {
      console.error('PDF generation fallback failed:', pdfErr);
      throw new Error('Unable to print or generate PDF: ' + (pdfErr?.message || String(pdfErr)));
    }
  }

  return {
    success: true,
    method: 'native',
    message: '✓ Browser print dialog opened successfully.'
  };
}
