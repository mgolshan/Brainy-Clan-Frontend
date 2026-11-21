/** Web: the browser's print dialog, which also offers "Save as PDF". */
export const canPrint = true;

/**
 * Prints a standalone HTML document from a hidden iframe (`srcdoc`, no URL), so only the
 * cards / table are printed, not the app around them, and no code ends up in an address.
 */
export async function printHtml(html: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  await new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error('print frame failed'));
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    throw new Error('print frame failed');
  }
  const cleanup = () => setTimeout(() => frame.remove(), 1_000);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  // Browsers without `afterprint` (or a blocked dialog): remove the frame later anyway.
  setTimeout(() => frame.remove(), 60_000);
}
