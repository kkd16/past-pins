import { mock } from 'bun:test';
import {
  createElement,
  useEffect,
  useImperativeHandle,
  type EffectCallback,
  type ReactNode,
  type Ref,
} from 'react';
import type { AccessibilityInfo, Alert } from 'react-native';

// One native module boundary keeps independently run and combined tests alike.
export const native = {
  AppState: {
    currentState: 'active',
    addEventListener: mock((_event: string, _listener: (state: string) => void) => ({ remove() {} })),
  },
  Linking: { openSettings: mock(async () => {}) },
  AccessibilityInfo: {
    addEventListener: mock(
      (_event: string, _listener: (enabled: boolean) => void) => ({
        remove() {},
      }),
    ),
    isScreenReaderEnabled: mock(async () => false),
    announceForAccessibilityWithOptions:
      mock<typeof AccessibilityInfo.announceForAccessibilityWithOptions>(),
  },
  Alert: {
    prompt: mock<typeof Alert.prompt>(),
    alert: mock<typeof Alert.alert>(),
  },
  View: 'View',
  Animated: { View: 'AnimatedView' },
  Easing: {},
  useAnimatedValue: () => ({ interpolate: () => 0, setValue() {} }),
  useWindowDimensions: mock(() => ({ width: 375, height: 812, scale: 3, fontScale: 1 })),
  FlatList: function FlatList({ ref, ...props }: {
    ref: Ref<unknown>;
    data?: readonly unknown[];
    ListHeaderComponent?: ReactNode;
    ListEmptyComponent?: ReactNode;
  }) {
    useImperativeHandle(ref, () => ({ scrollToOffset: mock() }), []);
    return createElement(
      'FlatList',
      props,
      props.ListHeaderComponent,
      props.data?.length ? null : props.ListEmptyComponent,
    );
  },
  Keyboard: { dismiss: mock() },
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T>(styles: T) => styles, absoluteFill: {} },
};
mock.module('react-native', () => native);

mock.module('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-CA' }],
}));

export const navigation = {
  router: { push: mock(), navigate: mock(), dismissTo: mock(), back: mock() },
  routeId: 'ca',
  focused: true,
};

mock.module('expo-router', () => ({
  Stack: Object.assign(
    (props: { children?: ReactNode }) => createElement('Stack', props),
    {
      Screen: (props: { name: string }) => createElement('Stack.Screen', props),
      Protected: ({ guard, children }: { guard: boolean; children?: ReactNode }) => guard ? children : null,
    },
  ),
  router: navigation.router,
  useLocalSearchParams: () => ({ id: navigation.routeId }),
  useRootNavigationState: () => ({ key: 'root' }),
  useIsFocused: () => navigation.focused,
  useFocusEffect: (effect: EffectCallback) => {
    const focused = navigation.focused;
    useEffect(() => (focused ? effect() : undefined), [effect, focused]);
  },
}));
