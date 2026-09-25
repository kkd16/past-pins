import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { decodeBackup, encodeBackup } from '../data/backup';
import { UserFacingError } from '../data/errors';
import type { AppData } from '../data/model';
import { t } from '../localization';

function discardCachedFile(file: File) {
  try {
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  } catch {
    // Cache cleanup must not turn a successful backup into an error.
  }
}

export async function shareBackup(data: AppData) {
  const file = new File(
    Paths.cache,
    `Past-Pins-${new Date().toISOString().slice(0, 10)}.json`,
  );
  try {
    file.write(encodeBackup(data));
    await Sharing.shareAsync(file.uri, { UTI: 'public.json' });
  } finally {
    discardCachedFile(file);
  }
}

export async function pickBackup(): Promise<AppData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  try {
    if (file.size > 1_000_000)
      throw new UserFacingError(t('common.errors.backupTooLarge'));
    return decodeBackup(await file.text());
  } finally {
    discardCachedFile(file);
  }
}
