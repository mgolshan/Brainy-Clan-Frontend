import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * iOS/Android: writes the export to the cache folder and opens the share sheet, from which the
 * user saves it to Files / Drive or sends it (`saveExport.web.ts` downloads instead).
 */
export async function saveExportFile(name: string, json: string): Promise<'shared'> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: name,
  });
  return 'shared';
}
