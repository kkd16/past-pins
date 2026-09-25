import type { AppData } from '../data/model';

export type AtlasCommand =
  | { key: string | number; type: 'location'; point: [number, number] }
  | { key: string | number; type: 'focus'; id: string }
  | { key: string | number; type: 'reset' | 'north' };

export type AtlasViewportProps = {
  active: boolean;
  places: AppData['places'];
  homeCountryId: string | null;
  selectedId: string | null;
  selectedAnchor: readonly number[] | null;
  labels: boolean;
  command: AtlasCommand | null;
  topInset: number;
  bottomInset: number;
  onSelect: (id: string | null, anchor?: readonly number[]) => void;
  onCommandApplied: (key: string | number) => void;
};
