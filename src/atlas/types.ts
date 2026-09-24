import type { AppData } from '../data/model';

export type AtlasCommand =
  | { key: string | number; type: 'focus'; id: string }
  | { key: string | number; type: 'reset' | 'north' };

export type AtlasViewportProps = {
  places: AppData['places'];
  homeCountryId: string | null;
  selectedId: string | null;
  selectedAnchor: readonly number[] | null;
  labels: boolean;
  dockSelection: boolean;
  command: AtlasCommand | null;
  topInset: number;
  bottomInset: number;
  onSelect: (id: string | null, anchor?: readonly number[]) => void;
  onDetails: (id: string) => void;
  onCommandApplied: (key: string | number) => void;
};
