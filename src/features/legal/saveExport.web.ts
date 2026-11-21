/** File type of the download (default: JSON, the data export). */
export interface ExportFileType {
  mimeType: string;
  /** iOS Uniform Type Identifier (unused on web). */
  uti: string;
}

export const JSON_FILE: ExportFileType = { mimeType: 'application/json', uti: 'public.json' };
export const CSV_FILE: ExportFileType = {
  mimeType: 'text/csv;charset=utf-8',
  uti: 'public.comma-separated-values-text',
};

/** Web: downloads the export as a file (`.json` for the data export, `.csv` for a summary). */
export async function saveExportFile(
  name: string,
  contents: string,
  type: ExportFileType = JSON_FILE,
): Promise<'downloaded'> {
  const url = URL.createObjectURL(new Blob([contents], { type: type.mimeType }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the download before freeing the blob.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return 'downloaded';
}
