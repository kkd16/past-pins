import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { theme } from '../theme';
import { Button } from './Button';
import { ScreenHeader } from './ScreenHeader';

export function Sheet({
  title,
  onDone,
  children,
}: {
  title: string;
  onDone: () => void;
  children: ReactNode;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <ScreenHeader title={title}>
        <Button label="Done" variant="quiet" onPress={onDone} />
      </ScreenHeader>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: {
    width: '100%',
    maxWidth: theme.size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xl,
    gap: theme.space.lg,
  },
});
