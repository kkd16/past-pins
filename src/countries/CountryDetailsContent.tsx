import { router } from 'expo-router';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Surface } from '../components/Surface';
import { ToggleRow } from '../components/ToggleRow';
import { countryById } from './catalog';
import { appData as app } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { getPlaceStatus, isVisited } from '../data/model';
import { useActionGuard } from '../navigation/useActionGuard';
import { PlaceSelectionContent } from '../places/PlaceSelectionCard';
import { citiesHref, regionsHref, worldMapHref } from '../places/navigation';
import { getPlaceStatistics } from '../places/statistics';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';
import { t, formatList, formatNumber, language } from '../localization';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';

export function CountryDetailsContent({
  id,
  onShowMap = () => router.dismissTo(worldMapHref(id)),
  onDismiss = router.back,
  onToggleDetails,
  onPreviewLayout,
  expanded = true,
  autofocus = false,
}: {
  id: string;
  onShowMap?: () => void;
  onDismiss?: () => void;
  onToggleDetails?: () => void;
  onPreviewLayout?: ViewProps['onLayout'];
  expanded?: boolean;
  autofocus?: boolean;
}) {
  const data = useAppData((snapshot) => snapshot.data);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const country = countryById.get(id);
  const guard = useActionGuard(id);
  if (!country)
    return (
      <View style={styles.details}>
        <AppText tone="muted">{t('countries.details.notInCatalog')}</AppText>
        <Button label={t('common.done')} onPress={onDismiss} />
      </View>
    );

  const ready = dataStatus === 'ready';
  const onEscape = expanded && onToggleDetails ? onToggleDetails : onDismiss;
  const terminology = getCountrySubdivisionTerminology(id);
  const disabled = !ready || busy;
  const status = getPlaceStatus(data, id);
  const collected = isVisited(status);
  const home = data.homeCountryId === id;
  const cityStats = getPlaceStatistics(data.places, 'city', id);
  const cityProgress = ready ? t('places.cityCount', {
    count: cityStats.visited,
    amount: formatNumber(cityStats.visited),
  }) : undefined;
  const regionStats = getSubdivisionStatistics(data.places, id);
  const regionProgress =
    ready
      ? t('subdivisions.visitedSummary', {
          ...terminology,
          visited: formatNumber(regionStats.visited),
          total: formatNumber(regionStats.total),
        })
      : t(
          dataStatus === 'load-error'
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
      <View style={styles.preview} onLayout={onPreviewLayout}>
        <PlaceSelectionContent
          title={country.name}
          titleVariant="heading"
          subtitle={country.continent.name}
          status={ready ? status : undefined}
          home={home}
          disabled={disabled}
          onChangeStatus={(next) => {
            void app.setStatus([id], next, { preserveLived: false, isCurrent: guard() });
          }}
          onSaveToLists={() =>
            router.push({ pathname: '/lists/add', params: { placeId: id } })
          }
          onDismiss={onDismiss}
          onDetails={onToggleDetails}
          onEscape={onEscape}
          expanded={expanded}
          autofocus={autofocus}
        >
          <DataFeedback />
          <AppPressable
            accessibilityLabel={t('places.citiesIn', { place: country.name })}
            accessibilityValue={cityProgress ? { text: cityProgress } : undefined}
            onPress={() => router.navigate(citiesHref(id))}
            style={styles.regions}
          >
            <View style={styles.regionLabel}>
              <AppText variant="label">{t('places.cities')}</AppText>
              {cityProgress && <AppText variant="caption" tone="muted">
                {cityProgress}
              </AppText>}
            </View>
            <Icon name="chevronRight" />
          </AppPressable>
          {regionStats.total > 0 && (
            <AppPressable
              accessibilityLabel={t('subdivisions.countryTitle', {
                ...terminology,
                country: country.name,
              })}
              accessibilityValue={{ text: regionProgress }}
              accessibilityHint={t('subdivisions.openCountry', terminology)}
              onPress={() => router.push(regionsHref(id))}
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
        </PlaceSelectionContent>
      </View>
      <View style={styles.details} accessibilityElementsHidden={!expanded}>
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
        <Button
          label={t('countries.details.showMap')}
          variant="quiet"
          onPress={onShowMap}
        />
        {ready && (
          <Surface style={styles.stamp}>
            <AppPressable
              accessibilityLabel={t('stamps.enlargeStamp', {
                country: country.name,
              })}
              onPress={() =>
                router.push({ pathname: '/stamps/[id]', params: { id } })
              }
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
              onPress={() =>
                router.push({ pathname: '/share', params: { kind: 'stamp', id } })
              }
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.lg,
    gap: theme.space.sm,
  },
  details: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xl,
    gap: theme.space.lg,
  },
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
