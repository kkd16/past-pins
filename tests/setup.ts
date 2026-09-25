import { mock } from 'bun:test';
import type { Alert } from 'react-native';

// One native module boundary keeps independently run and combined tests alike.
export const native = {
  Alert: {
    prompt: mock<typeof Alert.prompt>(),
    alert: mock<typeof Alert.alert>(),
  },
  View: 'View',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {} },
};
mock.module('react-native', () => native);

mock.module('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-CA' }],
}));
