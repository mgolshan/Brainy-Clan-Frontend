import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** File type for the share sheet (default: JSON, the data export). */
export interface ExportFileType {
  mimeType: string;
  /** iOS Uniform Type Identifier. */
  uti: string;
}

export const JSON_FILE: ExportFileType = { mimeType: 'application/json', uti: 'public.json' };
export const CSV_FILE: ExportFileType = {
  mimeType: 'text/csv',
  uti: 'public.comma-separated-values-text',
};

/**
 * iOS/Android: writes the export to the cache folder and opens the share sheet, from which the
 * user saves it to Files / Drive or sends it (`saveExport.web.ts` downloads instead).
 */
export async function saveExportFile(
  name: string,
  contents: string,
  type: ExportFileType = JSON_FILE,
): Promise<'shared'> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(contents); // async since SDK 58 (`writeSync` is the old behaviour)
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
  await Sharing.shareAsync(file.uri, {
    mimeType: type.mimeType,
    UTI: type.uti,
    dialogTitle: name,
  });
  return 'shared';
}
