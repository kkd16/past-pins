import { mock } from 'bun:test';
import type { DocumentPickerResult } from 'expo-document-picker';

export const backupFile = {
  uri: 'file:///cache/backup.json',
  exists: true,
  size: 0,
  text: mock<() => Promise<string>>(),
  write: mock((_contents: string) => {}),
  delete: mock(() => {}),
};

export const documentPicker = {
  getDocumentAsync: mock(async (): Promise<DocumentPickerResult> => ({
    canceled: false,
    assets: [{ uri: backupFile.uri, name: 'backup.json', lastModified: 0 }],
  })),
};

export const sharing = {
  isAvailableAsync: mock(async () => true),
  shareAsync: mock(async (_uri: string, _options: unknown) => {}),
};

mock.module('expo-sharing', () => sharing);
mock.module('expo-document-picker', () => documentPicker);
mock.module('expo-file-system', () => ({
  File: function () { return backupFile; },
  Paths: { cache: { uri: 'file:///cache/' } },
}));
