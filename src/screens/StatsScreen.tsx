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
import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { t, formatNumber, formatPercent } from '../localization';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { StampCollectionLink } from '../stamps/StampCollectionLink';

function StatusTotals({
  stats,
  kind,
  largeText,
  loading,
  onPress,
}: {
  stats: { wishlist: number; lived: number; remaining: number };
  kind: 'countries' | 'regions';
  largeText: boolean;
  loading: boolean;
  onPress: (scope: CountryScope) => void;
}) {
  return (
    <View style={styles.totals}>
      {[
        {
          scope: 'wishlist' as const,
          label: t('countries.status.wishlist'),
          count: stats.wishlist,
          color: theme.color.wishlist,
        },
        {
          scope: 'lived' as const,
          label: t('countries.status.lived'),
          count: stats.lived,
          color: theme.color.lived,
        },
        {
          scope: 'not-visited' as const,
          label: t('countries.stats.remaining'),
          count: stats.remaining,
          color: theme.color.accent,
        },
      ].map(({ scope, label, count, color }) => {
        const value = loading ? '—' : formatNumber(count);
        return (
          <AppPressable
            key={scope}
            accessibilityLabel={t('places.statisticLabel', {
              kind: t(
                kind === 'regions' ? 'places.regions' : 'places.countries',
              ),
              label,
              value,
            })}
            accessibilityHint={t(
              kind === 'regions'
                ? 'places.matchingRegions'
                : 'countries.stats.matchingHint',
            )}
            disabled={loading}
            onPress={() => onPress(scope)}
            style={[styles.statistic, largeText && styles.fullWidth]}
          >
            <Surface style={styles.statisticContent}>
              <AppText
                variant={largeText ? 'heading' : 'number'}
                style={{ color }}
              >
                {value}
              </AppText>
              <View style={styles.cardHeading}>
                <AppText
                  variant="caption"
                  tone="muted"
                  style={styles.cardLabel}
                >
                  {label}
                </AppText>
                <Icon name="chevronRight" />
              </View>
            </Surface>
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
  onOpenStamps,
  onShare,
}: {
  onOpenSettings: () => void;
  onChooseHome: () => void;
  onOpenCountries: (scope: CountryScope, continent?: string) => void;
  onOpenCountry: (id: string) => void;
  onOpenRegions: (scope: CountryScope) => void;
  onOpenStamps: () => void;
  onShare: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const app = useAppData();
  const stats = useMemo(
    () => getTravelStatistics(app.data.places),
    [app.data.places],
  );
  const regionStats = useMemo(
    () => getSubdivisionStatistics(app.data.subdivisions),
    [app.data.subdivisions],
  );
  const home = app.data.homeCountryId
    ? countryById.get(app.data.homeCountryId)
    : undefined;
  const loading = app.status !== 'ready';
  const loadingMessage =
    app.status === 'load-error'
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
          accessibilityLabel={
            loading
              ? loadingMessage
              : t('countries.stats.visitedCount', {
                  count: stats.visited,
                  amount: formatNumber(stats.visited),
                })
          }
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
          disabled={loading || app.busy}
          onPress={onShare}
        />
        <AppPressable
          accessibilityLabel={
            loading
              ? loadingMessage
              : t('places.regionsProgress', {
                  visited: formatNumber(regionStats.visited),
                  total: formatNumber(regionStats.total),
                })
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
                disabled={loading || app.busy}
                onPress={onChooseHome}
              />
            </View>
          ) : (
            <Button
              label={t('countries.stats.chooseHome')}
              variant="quiet"
              disabled={loading || app.busy}
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
              accessibilityLabel={t('countries.stats.continentProgress', {
                name: continent.name,
                visited: formatNumber(continent.visited),
                total: formatNumber(continent.total),
              })}
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
  journey: { padding: theme.space.xl, gap: theme.space.sm },
  regionJourney: { paddingHorizontal: theme.space.lg },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  cardLabel: { flex: 1 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  statistic: { flexGrow: 1, flexBasis: 150 },
  statisticContent: { flex: 1, padding: theme.space.lg, gap: theme.space.sm },
  fullWidth: { flexBasis: '100%' },
  continents: { paddingHorizontal: theme.space.lg },
  explanation: { paddingHorizontal: theme.space.sm },
  home: {
    padding: theme.space.lg,
    gap: theme.space.sm,
    alignItems: 'flex-start',
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
