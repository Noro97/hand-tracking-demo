/**
 * Triggers a browser file download of JSON-serializable data.
 * Safe in browser and headless environments.
 */
export function downloadJson(data: unknown, filename: string): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
