import { useReducedMotion } from '../motion/ReducedMotion';
import { theme } from '../theme';

export function useStackScreenOptions() {
  const reducedMotion = useReducedMotion();
  return {
    headerStyle: { backgroundColor: theme.color.background },
    headerTintColor: theme.color.accent,
    headerBackButtonDisplayMode: 'minimal',
    headerTitleStyle: { color: theme.color.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.color.background },
    animation: reducedMotion ? 'none' : 'default',
  } as const;
}
