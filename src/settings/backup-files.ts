import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { decodeBackup, encodeBackup } from '../data/backup';
import type { AppData } from '../data/model';

function discardCachedFile(file: File) {
  try {
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  } catch {
    // Cache cleanup must not turn a successful backup into an error.
  }
}

export async function shareBackup(data: AppData) {
  await shareDataFile(encodeBackup(data), 'Backup');
}

export async function shareDataFile(text: string, kind: 'Backup' | 'Recovery' | 'Diagnostics') {
  const file = new File(
    Paths.cache,
    `Past-Pins-${kind}-${new Date().toISOString().slice(0, 10)}.json`,
  );
  try {
    file.write(text);
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
    return decodeBackup(await file.text());
  } finally {
    discardCachedFile(file);
  }
}
