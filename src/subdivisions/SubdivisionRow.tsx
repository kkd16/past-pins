import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Checkmark } from '../components/Checkmark';
import { Icon } from '../components/Icon';
import { getStatusPresentation } from '../countries/status';
import { isVisited, type PlaceStatus } from '../data/model';
import { t } from '../localization';
import { theme } from '../theme';
import type { Subdivision } from './types';

export const SubdivisionRow = memo(function SubdivisionRow({
  region,
  status,
  disabled,
  selecting,
  selected,
  onPress,
  onShowMap,
}: {
  region: Subdivision;
  status: PlaceStatus;
  disabled: boolean;
  selecting: boolean;
  selected: boolean;
  onPress: (id: string) => void;
  onShowMap: (id: string) => void;
}) {
  const presentation = getStatusPresentation(status);
  return (
    <View
      style={[
        styles.row,
        (selecting ? selected : isVisited(status)) && styles.highlight,
      ]}
    >
      <AppPressable
        style={styles.details}
        disabled={disabled}
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={t('subdivisions.regionStatus', {
          name: region.name,
          status: presentation.label,
        })}
        accessibilityHint={
          selecting ? undefined : t('subdivisions.changeStatusHint')
        }
        onPress={() => onPress(region.id)}
      >
        <View style={styles.text}>
          <AppText>{region.name}</AppText>
          {region.kind ? (
            <AppText variant="caption" tone="muted">
              {region.kind}
            </AppText>
          ) : null}
          <AppText variant="caption" style={{ color: presentation.color }}>
            {presentation.label}
          </AppText>
        </View>
        {selecting ? (
          <Checkmark checked={selected} />
        ) : (
          <Icon name={presentation.icon} color={presentation.color} />
        )}
      </AppPressable>
      {!selecting && (
        <AppPressable
          style={styles.mapButton}
          accessibilityLabel={t('subdivisions.showRegion', {
            name: region.name,
          })}
          onPress={() => onShowMap(region.id)}
        >
          <Icon name="location" />
        </AppPressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
  },
  highlight: { backgroundColor: theme.color.visitedSurface },
  details: {
    flex: 1,
    minHeight: theme.size.row,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  text: { flex: 1, gap: theme.space.xs },
  mapButton: {
    width: theme.size.touch,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
