import { StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Surface } from '../components/Surface';
import { ToggleRow } from '../components/ToggleRow';
import { countryById } from './catalog';
import { getStatusPresentation } from './status';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus, isVisited } from '../data/model';
import { PlaceStatusControl } from '../places/PlaceStatusControl';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';
import { t, formatList, formatNumber, language } from '../localization';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';

export function CountryDetailsContent({
  id,
  onShowMap,
  onOpenRegions,
  onSaveToLists,
  onShareStamp,
  onEnlargeStamp,
  showOverview = true,
}: {
  id: string;
  onShowMap: (id: string) => void;
  onOpenRegions: (id: string) => void;
  onSaveToLists: (id: string) => void;
  onShareStamp: () => void;
  onEnlargeStamp: () => void;
  showOverview?: boolean;
}) {
  const app = useAppData();
  const country = countryById.get(id);
  if (!country)
    return <AppText tone="muted">{t('countries.details.notInCatalog')}</AppText>;

  const ready = app.status === 'ready';
  const terminology = getCountrySubdivisionTerminology(id);
  const disabled = !ready || app.busy;
  const status = getPlaceStatus(app.data, id);
  const collected = isVisited(status);
  const home = app.data.homeCountryId === id;
  const presentation = getStatusPresentation(status, home);
  const regionStats = getSubdivisionStatistics(app.data.subdivisions, id);
  const regionProgress =
    ready
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
  const facts = [
    { label: t('countries.details.capital'), value: country.capital },
    {
      label: t('countries.details.languages'),
      value: formatList(country.languages),
    },
    {
      label: t('countries.details.currencies'),
      value: formatList(country.currencies),
    },
  ].filter(({ value }) => value);

  return (
    <>
      {ready && showOverview && (
        <Surface
          style={[
            styles.status,
            { backgroundColor: presentation.backgroundColor },
          ]}
        >
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
      {ready && (
        <Surface>
          <ToggleRow
            title={t('common.currentHome')}
            description={t('countries.details.homeHint')}
            accessibilityLabel={t('countries.details.homeLabel', {
              name: country.name,
            })}
            value={home}
            disabled={disabled}
            onValueChange={(next) => app.setHome(next ? id : null)}
          />
        </Surface>
      )}
      {showOverview && <DataFeedback />}
      {showOverview && regionStats.total > 0 && (
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
        {showOverview && (
          <Button
            label={t('lists.saveToLists')}
            variant="quiet"
            disabled={disabled}
            onPress={() => onSaveToLists(id)}
          />
        )}
      </View>
      {ready && (
        <Surface style={styles.stamp}>
          <AppPressable
            accessibilityLabel={t('stamps.enlargeStamp', {
              country: country.name,
            })}
            onPress={onEnlargeStamp}
            style={styles.stampArtwork}
          >
            <CountryStamp
              country={country}
              collected={collected}
              size="100%"
            />
            <View style={styles.enlargeIcon} pointerEvents="none">
              <Icon name="expand" color={theme.color.accent} />
            </View>
          </AppPressable>
          <Button
            label={t('sharing.stampAction')}
            variant="quiet"
            disabled={disabled}
            onPress={onShareStamp}
            style={styles.shareStamp}
          />
        </Surface>
      )}
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
  );
}

const styles = StyleSheet.create({
  stamp: {
    backgroundColor: theme.color.surfaceWarm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xl,
    alignItems: 'center',
    gap: theme.space.lg,
  },
  stampArtwork: { width: '100%', maxWidth: 240, aspectRatio: 1 },
  shareStamp: { alignSelf: 'stretch' },
  enlargeIcon: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    padding: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceRaised,
  },
  status: { padding: theme.space.md, gap: theme.space.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  facts: { padding: theme.space.lg, gap: theme.space.lg },
  fact: { gap: theme.space.xs },
  regions: {
    ...theme.surface.panel,
    backgroundColor: theme.color.surfaceCool,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  regionLabel: { flex: 1, gap: theme.space.xs },
});
