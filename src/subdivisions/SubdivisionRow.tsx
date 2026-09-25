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
  countryName,
  status,
  disabled,
  selecting,
  selected,
  onPress,
  onChangeStatus,
  onSaveToLists,
}: {
  region: Subdivision;
  countryName?: string;
  status: PlaceStatus;
  disabled: boolean;
  selecting: boolean;
  selected: boolean;
  onPress: (id: string) => void;
  onChangeStatus: (id: string) => void;
  onSaveToLists: (id: string) => void;
}) {
  const presentation = getStatusPresentation(status);
  const name = countryName
    ? t('lists.regionName', { name: region.name, country: countryName })
    : region.name;
  return (
    <View
      style={[
        styles.row,
        (selecting ? selected : isVisited(status)) && styles.highlight,
      ]}
    >
      <AppPressable
        style={styles.details}
        disabled={selecting && disabled}
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={t('subdivisions.regionStatus', {
          name,
          status: presentation.label,
        })}
        accessibilityHint={
          selecting ? undefined : t('subdivisions.openRegionHint')
        }
        onPress={() => onPress(region.id)}
      >
        <View style={styles.text}>
          <AppText>{region.name}</AppText>
          {countryName && (
            <AppText variant="caption" tone="muted">
              {countryName}
            </AppText>
          )}
          {region.kind ? (
            <AppText variant="caption" tone="muted">
              {region.kind}
            </AppText>
          ) : null}
          <AppText variant="caption" style={{ color: presentation.color }}>
            {presentation.label}
          </AppText>
        </View>
        {selecting && <Checkmark checked={selected} />}
      </AppPressable>
      {!selecting && (
        <>
          <AppPressable
            style={styles.action}
            accessibilityLabel={t('subdivisions.changeRegionStatus', {
              name,
            })}
            disabled={disabled}
            onPress={() => onChangeStatus(region.id)}
          >
            <Icon name={presentation.icon} color={presentation.color} />
          </AppPressable>
          <AppPressable
            style={styles.action}
            accessibilityLabel={t('subdivisions.saveRegionToLists', {
              name,
            })}
            disabled={disabled}
            onPress={() => onSaveToLists(region.id)}
          >
            <Icon name="list" />
          </AppPressable>
        </>
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
  action: {
    width: theme.size.touch,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
