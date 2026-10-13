/**
 * Smart Print Utility for DigiSkool
 * 
 * Directly triggers the native browser print preview dialog (`window.print()`).
 * Works in tandem with @media print CSS rules in src/index.css which isolate
 * vouchers, receipts, and admission forms cleanly.
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
 * Open a dedicated clean browser window to print isolated element
 */
export function printElementInNewWindow(elementId: string, title?: string): boolean {
  try {
    const el = document.getElementById(elementId);
    if (!el) return false;
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return false;

    // Collect all stylesheets from current document
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'DigiSkool Official Document'}</title>
          ${styleTags}
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: ui-sans-serif, system-ui, sans-serif; background: #fff; margin: 0; padding: 10px; }
            #printable-voucher { width: 100% !important; margin: 0 auto; }
            @media print {
              body { padding: 0 !important; }
              #printable-voucher { box-shadow: none !important; border: none !important; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:center;">
            ${el.outerHTML}
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                try {
                  window.focus();
                  window.print();
                } catch(e) {
                  console.error(e);
                }
              }, 400);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    return true;
  } catch (e) {
    console.warn('Popup print window failed, falling back:', e);
    return false;
  }
}

/**
 * Directly prints document and opens the browser's native print preview dialog.
 */
export async function executeSmartPrint(
  options: SmartPrintOptions
): Promise<{ success: boolean; method: 'native' | 'popup' | 'pdf'; message: string }> {
  const originalTitle = document.title;
  
  if (options.documentTitle) {
    try {
      document.title = options.documentTitle;
    } catch {
      // ignore
    }
  }

  // Ensure element exists if elementId is passed
  if (options.elementId) {
    const el = document.getElementById(options.elementId);
    if (!el) {
      console.warn(`Print element #${options.elementId} not found, falling back to PDF`);
      if (options.fallbackPdfGenerator) {
        await options.fallbackPdfGenerator();
        return {
          success: true,
          method: 'pdf',
          message: '✓ Print document generated & downloaded as high-resolution PDF.'
        };
      }
    }
  }

  // If in an iframe, try popup window first or window.print
  let printSucceeded = false;

  if (isRunningInIframe() && options.elementId) {
    const popupOpened = printElementInNewWindow(options.elementId, options.documentTitle);
    if (popupOpened) {
      return {
        success: true,
        method: 'popup',
        message: '✓ Print window opened with official voucher.'
      };
    }
  }

  try {
    document.body.classList.add('is-printing');
    // Ensure all styles and fonts are applied
    await new Promise((r) => setTimeout(r, 80));
    window.print();
    printSucceeded = true;
  } catch (err) {
    console.warn('Native window.print() encountered an error:', err);
    printSucceeded = false;
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

  // If print didn't produce dialog or failed, generate fallback PDF
  if (!printSucceeded && options.fallbackPdfGenerator) {
    try {
      await options.fallbackPdfGenerator();
      return {
        success: true,
        method: 'pdf',
        message: '✓ High-resolution print-ready PDF generated & downloaded!'
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
