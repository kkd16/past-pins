import * as Application from 'expo-application';
import { File, Paths } from 'expo-file-system';

import ownedFiles from '../storage/owned-files.json';
import { createDiagnosticLog } from './diagnostics';

const file = () => new File(Paths.document, ownedFiles.diagnosticsFile);
export const diagnostics = createDiagnosticLog({
  async read() { const log = file(); return log.exists ? log.text() : null; },
  async write(text) { file().write(text); },
  async clear() { const log = file(); if (log.exists) log.delete(); },
}, { appVersion: Application.nativeApplicationVersion, build: Application.nativeBuildVersion });
