import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { theme } from '../theme';
import { Button } from './Button';
import { Screen } from './Screen';
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
    <Screen style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <ScreenHeader title={title}>
          <Button label="Done" variant="quiet" onPress={onDone} />
        </ScreenHeader>
        {children}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.space.xl },
  content: { paddingBottom: theme.space.xl, gap: theme.space.lg },
});
