import type { AppData } from './model';
import { documentCodec } from './document';

export function encodeBackup(data: AppData): string {
  return JSON.stringify(documentCodec.encode(data), null, 2);
}

export function decodeBackup(text: string): AppData {
  return documentCodec.decode(text).data;
}
