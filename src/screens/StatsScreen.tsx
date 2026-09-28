import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { Surface } from '../components/Surface';
import { countryById } from '../countries/catalog';
import type { CountryScope } from '../countries/filters';
import { ProgressSummary } from '../countries/ProgressSummary';
import { getTravelStatistics } from '../countries/statistics';
import { useAppData } from '../data/AppData';
import { theme } from '../theme';
import { t, formatNumber, formatPercent } from '../localization';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';
import { getPlaceStatistics } from '../places/statistics';
import { StampCollectionLink } from '../stamps/StampCollectionLink';

function StatusTotals({
  stats,
  kind,
  largeText,
  loading,
  onPress,
}: {
  largeText: boolean;
  loading: boolean;
  onPress: (scope: CountryScope) => void;
} & (
  | { kind: 'countries' | 'regions'; stats: { wishlist: number; lived: number; remaining: number } }
  | { kind: 'cities'; stats: { wishlist: number; lived: number; visited: number } }
)) {
  const tiles = kind === 'countries' && !largeText;
  const wishlist = {
    scope: 'wishlist' as const,
    label: t('countries.status.wishlist'),
    count: stats.wishlist,
    color: theme.color.wishlist,
    backgroundColor: theme.color.surfaceWarm,
  };
  const lived = {
    scope: 'lived' as const,
    label: t('countries.status.lived'),
    count: stats.lived,
    color: theme.color.lived,
    backgroundColor: theme.color.surfaceCool,
  };
  const items = kind === 'cities' ? [
    {
      scope: 'visited' as const,
      label: t('places.citiesVisited'),
      count: stats.visited,
      color: theme.color.visited,
      backgroundColor: theme.color.visitedSurface,
    },
    lived,
    wishlist,
  ] : [
    wishlist,
    lived,
    {
      scope: 'not-visited' as const,
      label: t('countries.stats.remaining'),
      count: stats.remaining,
      color: theme.color.textMuted,
      backgroundColor: theme.color.surface,
    },
  ];
  return (
    <View style={tiles ? styles.totalTiles : styles.totals}>
      {items.map(({ scope, label, count, color, backgroundColor }, index) => {
        const value = loading ? '—' : formatNumber(count);
        return (
          <AppPressable
            key={scope}
            accessibilityLabel={t('places.statisticLabel', {
              kind: t(`places.${kind}`),
              label: scope === 'visited' ? t('countries.status.visited') : label,
              value,
            })}
            accessibilityHint={t(
              kind === 'cities' ? 'places.matchingCities' : kind === 'regions'
                ? 'places.matchingRegions'
                : 'countries.stats.matchingHint',
            )}
            disabled={loading}
            onPress={() => onPress(scope)}
            style={[
              styles.statistic,
              tiles
                ? [styles.statisticTile, { backgroundColor }]
                : index > 0 && styles.statisticBorder,
            ]}
          >
            <View
              style={[
                styles.statisticContent,
                (largeText || tiles) && styles.statisticStack,
              ]}
            >
              <AppText
                variant={tiles ? 'caption' : 'body'}
                style={tiles ? styles.tileLabel : !largeText && styles.cardLabel}
              >
                {label}
              </AppText>
              <AppText variant={tiles ? 'number' : 'label'} style={{ color }}>
                {value}
              </AppText>
            </View>
            {!tiles && <Icon name="chevronRight" />}
          </AppPressable>
        );
      })}
    </View>
  );
}

export function StatsScreen({
  onOpenSettings,
  onChooseHome,
  onOpenCountries,
  onOpenCountry,
  onOpenRegions,
  onOpenCities,
  onOpenStamps,
  onShare,
}: {
  onOpenSettings: () => void;
  onChooseHome: () => void;
  onOpenCountries: (scope: CountryScope, continent?: string) => void;
  onOpenCountry: (id: string) => void;
  onOpenRegions: (scope: CountryScope) => void;
  onOpenCities: (scope: CountryScope) => void;
  onOpenStamps: () => void;
  onShare: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const homeCountryId = useAppData((snapshot) => snapshot.data.homeCountryId);
  const places = useAppData((snapshot) => snapshot.data.places);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const stats = useMemo(
    () => getTravelStatistics(places),
    [places],
  );
  const regionStats = useMemo(
    () => getSubdivisionStatistics(places),
    [places],
  );
  const cityStats = useMemo(() => getPlaceStatistics(places, 'city'), [places]);
  const home = homeCountryId
    ? countryById.get(homeCountryId)
    : undefined;
  const loading = dataStatus !== 'ready';
  const loadingMessage =
    dataStatus === 'load-error'
      ? t('countries.loadError')
      : t('countries.loadingPlaces');
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <ScreenHeader title={t('countries.stats.title')}>
          <IconButton
            name="settings"
            accessibilityLabel={t('common.settings')}
            onPress={onOpenSettings}
          />
        </ScreenHeader>
        <DataFeedback />
        <AppPressable
          accessibilityHint={t('countries.stats.visitedHint')}
          disabled={loading}
          onPress={() => onOpenCountries('visited')}
        >
          <Surface style={styles.journey}>
            <View style={styles.cardHeading}>
              <AppText variant="label" style={styles.cardLabel}>
                {t('countries.stats.visited')}
              </AppText>
              <Icon name="chevronRight" />
            </View>
            <AppText variant={largeText ? 'title' : 'display'} tone="visited">
              {loading ? '—' : formatNumber(stats.visited)}
            </AppText>
            <AppText tone="muted">
              {loading
                ? loadingMessage
                : t('countries.stats.percentVisited', {
                    percent: formatPercent(stats.visitedRatio),
                  })}
            </AppText>
          </Surface>
        </AppPressable>
        <StatusTotals
          stats={stats}
          kind="countries"
          largeText={largeText}
          loading={loading}
          onPress={onOpenCountries}
        />
        <Button
          label={t('sharing.worldAction')}
          variant="quiet"
          disabled={loading || busy}
          onPress={onShare}
        />
        <AppPressable
          accessibilityLabel={
            loading
              ? loadingMessage
              : t('subdivisions.visitedSummary', {
                  ...getCountrySubdivisionTerminology(),
                  visited: formatNumber(regionStats.visited),
                  total: formatNumber(regionStats.total),
                })
          }
          accessibilityValue={
            loading
              ? undefined
              : {
                  text: formatPercent(
                    regionStats.total
                      ? regionStats.visited / regionStats.total
                      : 0,
                  ),
                }
          }
          accessibilityHint={t('places.matchingRegions')}
          disabled={loading}
          onPress={() => onOpenRegions('visited')}
        >
          <Surface style={styles.regionJourney}>
            <View accessibilityElementsHidden style={styles.cardHeading}>
              <View style={styles.cardLabel}>
                <ProgressSummary
                  kind="subdivisions"
                  label={t('subdivisions.title')}
                  visited={regionStats.visited}
                  total={regionStats.total}
                  loading={loading}
                />
              </View>
              <Icon name="chevronRight" />
            </View>
          </Surface>
        </AppPressable>
        <StatusTotals
          stats={regionStats}
          kind="regions"
          largeText={largeText}
          loading={loading}
          onPress={onOpenRegions}
        />
        <StatusTotals
          stats={cityStats}
          kind="cities"
          largeText={largeText}
          loading={loading}
          onPress={onOpenCities}
        />
        <StampCollectionLink onPress={onOpenStamps} />
        <Surface style={styles.home}>
          <View style={styles.homeLabel}>
            <Icon name="home" color={theme.color.lived} />
            <AppText variant="label" style={styles.cardLabel}>
              {t('common.currentHome')}
            </AppText>
          </View>
          {home ? (
            <View style={styles.homeActions}>
              <Button
                label={home.name}
                variant="quiet"
                onPress={() => onOpenCountry(home.id)}
              />
              <Button
                label={t('settings.changeHome')}
                variant="quiet"
                disabled={loading || busy}
                onPress={onChooseHome}
              />
            </View>
          ) : (
            <Button
              label={t('countries.stats.chooseHome')}
              variant="quiet"
              disabled={loading || busy}
              onPress={onChooseHome}
            />
          )}
        </Surface>
        <AppText variant="heading" accessibilityRole="header">
          {t('countries.byContinent')}
        </AppText>
        <Surface style={styles.continents}>
          {stats.byContinent.map((continent) => (
            <AppPressable
              key={continent.id}
              accessibilityLabel={
                loading
                  ? continent.name
                  : t('countries.stats.continentProgress', {
                      name: continent.name,
                      visited: formatNumber(continent.visited),
                      total: formatNumber(continent.total),
                    })
              }
              accessibilityValue={{
                text: loading
                  ? loadingMessage
                  : formatPercent(
                      continent.total
                        ? continent.visited / continent.total
                        : 0,
                    ),
              }}
              accessibilityHint={t('countries.stats.continentHint')}
              disabled={loading}
              onPress={() => onOpenCountries('visited', continent.id)}
            >
              <View accessibilityElementsHidden style={styles.cardHeading}>
                <View style={styles.cardLabel}>
                  <ProgressSummary
                    label={continent.name}
                    visited={continent.visited}
                    total={continent.total}
                    loading={loading}
                  />
                </View>
                <Icon name="chevronRight" />
              </View>
            </AppPressable>
          ))}
        </Surface>
        <AppText variant="caption" tone="muted" style={styles.explanation}>
          {t('countries.stats.explanation')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space.xl, gap: theme.space.lg },
  journey: {
    padding: theme.space.xl,
    gap: theme.space.sm,
    backgroundColor: theme.color.visitedSurface,
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.border,
  },
  regionJourney: {
    paddingHorizontal: theme.space.lg,
    backgroundColor: theme.color.surfaceCool,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  cardLabel: { flex: 1 },
  totals: { ...theme.surface.panel, paddingHorizontal: theme.space.lg },
  totalTiles: {
    flexDirection: 'row',
    gap: theme.space.sm,
  },
  statistic: {
    minHeight: theme.size.row,
    paddingVertical: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  statisticBorder: {
    borderTopWidth: theme.stroke.subtle,
    borderTopColor: theme.color.border,
  },
  statisticContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  statisticStack: { flexDirection: 'column', alignItems: 'flex-start' },
  statisticTile: {
    flex: 1,
    minWidth: 0,
    padding: theme.space.md,
    alignItems: 'stretch',
    borderRadius: theme.radius.sm,
    borderCurve: 'continuous',
  },
  tileLabel: { alignSelf: 'stretch', flexGrow: 1 },
  continents: { paddingHorizontal: theme.space.lg },
  explanation: { paddingHorizontal: theme.space.sm },
  home: {
    padding: theme.space.lg,
    gap: theme.space.sm,
    backgroundColor: theme.color.surfaceCool,
  },
  homeLabel: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  homeActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
});
