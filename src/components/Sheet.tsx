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
      bounces={false}
    >
      {onCancel ? (
        <>
          <View style={styles.actions}>
            <Button
              label={t('common.cancel')}
              variant="quiet"
              onPress={onCancel}
            />
            <Button label={doneLabel} variant="quiet" onPress={onDone} />
          </View>
          <ScreenHeader title={title} subtitle={subtitle} compact />
        </>
      ) : (
        <ScreenHeader title={title} subtitle={subtitle} compact>
          <Button label={doneLabel} variant="quiet" onPress={onDone} />
        </ScreenHeader>
      )}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
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
