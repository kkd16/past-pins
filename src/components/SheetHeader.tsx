import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { useScreenReaderEnabled } from '../accessibility/useScreenReaderEnabled';
import { t } from '../localization';
import { theme } from '../theme';

export function SheetHeader({ title, onDismiss }: { title: string; onDismiss: () => void }) {
  const screenReader = useScreenReaderEnabled();
  return (
    <View style={styles.header}>
      <AppText
        variant="heading"
        accessibilityRole="header"
        accessibilityActions={[{ name: 'dismiss', label: t('common.done') }]}
        onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === 'dismiss') onDismiss(); }}
        style={styles.title}
      >{title}</AppText>
      {screenReader && <IconButton name="close" accessibilityLabel={t('common.done')} onPress={onDismiss} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.lg },
  title: { flex: 1 },
});
