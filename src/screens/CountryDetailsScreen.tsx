import { useMemo } from 'react';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Surface } from '../components/Surface';
import { countryById } from '../countries/catalog';
import { getStatusPresentation } from '../countries/status';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus, isVisited } from '../data/model';
import { useActionGuard } from '../navigation/useActionGuard';
import { PlaceStatusControl } from '../places/PlaceStatusControl';
import { theme } from '../theme';
import { t, formatList, formatNumber, language } from '../localization';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';

export function CountryDetailsScreen({
  id,
  onDone,
  onShowMap,
  onOpenRegions,
  onSaveToLists,
  onOpenStamp,
}: {
  id: string;
  onDone: () => void;
  onShowMap: (id: string) => void;
  onOpenRegions: (id: string) => void;
  onSaveToLists: (id: string) => void;
  onOpenStamp: (id: string) => void;
}) {
  const app = useAppData();
  const country = countryById.get(id);
  const terminology = getCountrySubdivisionTerminology(id);
  const disabled = app.status !== 'ready' || app.busy;
  const status = getPlaceStatus(app.data, id);
  const home = app.data.homeCountryId === id;
  const presentation = getStatusPresentation(status, home);
  const actionScope = useMemo(
    () => ({ id, data: app.data, resetVersion: app.resetVersion }),
    [id, app.data, app.resetVersion],
  );
  const guard = useActionGuard(actionScope);
  const regionStats = getSubdivisionStatistics(app.data.subdivisions, id);
  const regionProgress =
    app.status === 'ready'
      ? t('subdivisions.visitedSummary', {
          ...terminology,
          visited: formatNumber(regionStats.visited),
          total: formatNumber(regionStats.total),
        })
      : t(
          app.status === 'load-error'
            ? 'countries.loadError'
            : 'countries.loadingPlaces',
        );
  const facts = country
    ? [
        { label: t('countries.details.capital'), value: country.capital },
        {
          label: t('countries.details.languages'),
          value: formatList(country.languages),
        },
        {
          label: t('countries.details.currencies'),
          value: formatList(country.currencies),
        },
      ].filter(({ value }) => value)
    : [];

  function showMore() {
    if (!country || disabled) return;
    const isCurrent = guard();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: country.name,
        message: t('countries.details.actionsHint'),
        options: [
          t('common.markLived'),
          t(home ? 'countries.details.clearHome' : 'countries.details.setHome'),
          t('lists.saveToLists'),
          t(isVisited(status) ? 'stamps.viewStamp' : 'stamps.previewStamp'),
          t('common.cancel'),
        ],
        cancelButtonIndex: 4,
        userInterfaceStyle: theme.appearance.colorScheme,
      },
      (index) => {
        if (!isCurrent()) return;
        if (index === 0)
          void app.setStatus([id], 'lived', { preserveLived: false });
        else if (index === 1) app.setHome(home ? null : id);
        else if (index === 2) onSaveToLists(id);
        else if (index === 3) onOpenStamp(id);
      },
    );
  }

  return (
    <Sheet
      title={country?.name ?? t('countries.details.notFound')}
      subtitle={country?.continent.name}
      onDone={onDone}
    >
      {country ? (
        <>
          {app.status === 'ready' && (
            <Surface style={styles.status}>
              <AppText variant="label" style={{ color: presentation.color }}>
                {presentation.label}
              </AppText>
              <PlaceStatusControl
                status={status}
                disabled={disabled}
                onChange={(next) => {
                  void app.setStatus([id], next, { preserveLived: false });
                }}
              />
            </Surface>
          )}
          <DataFeedback />
          {regionStats.total > 0 && (
            <AppPressable
              accessibilityLabel={t('subdivisions.countryTitle', {
                ...terminology,
                country: country.name,
              })}
              accessibilityValue={{ text: regionProgress }}
              accessibilityHint={t('subdivisions.openCountry', terminology)}
              onPress={() => onOpenRegions(id)}
              style={styles.regions}
            >
              <View style={styles.regionLabel}>
                <AppText variant="label">{terminology.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {regionProgress}
                </AppText>
              </View>
              <Icon name="chevronRight" />
            </AppPressable>
          )}
          <View style={styles.actions}>
            <Button
              label={t('countries.details.showMap')}
              variant="quiet"
              onPress={() => onShowMap(id)}
            />
            <Button
              label={t('common.more')}
              variant="quiet"
              disabled={disabled}
              onPress={showMore}
            />
          </View>
          {facts.length > 0 && (
            <Surface style={styles.facts}>
              <AppText variant="heading" accessibilityRole="header">
                {t('countries.details.facts')}
              </AppText>
              {facts.map(({ label, value }) => (
                <View
                  key={label}
                  accessible
                  accessibilityLanguage={language}
                  style={styles.fact}
                >
                  <AppText variant="caption" tone="muted">
                    {label}
                  </AppText>
                  <AppText>{value}</AppText>
                </View>
              ))}
            </Surface>
          )}
        </>
      ) : (
        <AppText tone="muted">{t('countries.details.notInCatalog')}</AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  status: { padding: theme.space.md, gap: theme.space.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  facts: { padding: theme.space.lg, gap: theme.space.lg },
  fact: { gap: theme.space.xs },
  regions: {
    ...theme.surface.panel,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  regionLabel: { flex: 1, gap: theme.space.xs },
});
