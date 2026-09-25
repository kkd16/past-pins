import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { theme } from '../theme';
import { t } from '../localization';
import { Button } from './Button';
import { ScreenHeader } from './ScreenHeader';

export function Sheet({
  title,
  subtitle,
  onDone,
  onCancel,
  doneLabel = t('common.done'),
  children,
}: {
  title: string;
  subtitle?: string;
  onDone: () => void;
  onCancel?: () => void;
  doneLabel?: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      onAccessibilityEscape={onCancel ?? onDone}
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
    >
      <View style={styles.actions}>
        {onCancel && (
          <Button
            label={t('common.cancel')}
            variant="quiet"
            onPress={onCancel}
          />
        )}
        <Button
          label={doneLabel}
          variant="quiet"
          onPress={onDone}
          style={styles.done}
        />
      </View>
      <ScreenHeader title={title} subtitle={subtitle} compact />
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: theme.color.background,
    paddingVertical: theme.space.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  done: { marginStart: 'auto' },
  scroll: { flexGrow: 0 },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xl,
    gap: theme.space.lg,
  },
});
