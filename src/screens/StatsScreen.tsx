import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { Surface } from '../components/Surface';
import { UndoNotice } from '../components/UndoNotice';
import { countryById } from '../countries/catalog';
import type { CountryScope } from '../countries/filters';
import { ProgressSummary } from '../countries/ProgressSummary';
import { getTravelStatistics } from '../countries/statistics';
import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { t, formatNumber, formatPercent, language } from '../localization';

function Statistic({
  value,
  label,
  largeText,
  color,
  disabled,
  onPress,
}: {
  value: string;
  label: string;
  largeText: boolean;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('countries.stats.summary', { label, value })}
      accessibilityLanguage={language}
      accessibilityHint={t('countries.stats.matchingHint')}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statistic,
        largeText && styles.fullWidth,
        pressed && styles.pressed,
      ]}
    >
      <Surface style={styles.statisticContent}>
        <AppText variant={largeText ? 'heading' : 'number'} style={{ color }}>
          {value}
        </AppText>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
      </Surface>
    </Pressable>
  );
}

export function StatsScreen({
  onOpenSettings,
  onChooseHome,
  onOpenCountries,
  onOpenCountry,
}: {
  onOpenSettings: () => void;
  onChooseHome: () => void;
  onOpenCountries: (scope: CountryScope, continent?: string) => void;
  onOpenCountry: (id: string) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const app = useAppData();
  const stats = useMemo(
    () => getTravelStatistics(app.data.places),
    [app.data.places],
  );
  const home = app.data.homeCountryId
    ? countryById.get(app.data.homeCountryId)
    : undefined;
  const loading = app.status !== 'ready';
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
        <UndoNotice />
        <Pressable
          accessibilityRole="button"
          accessibilityLanguage={language}
          accessibilityLabel={
            loading
              ? t('countries.loadingPlaces')
              : t('countries.stats.visitedCount', {
                  count: stats.visited,
                  amount: formatNumber(stats.visited),
                })
          }
          accessibilityHint={t('countries.stats.visitedHint')}
          disabled={loading}
          onPress={() => onOpenCountries('visited')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Surface style={styles.journey}>
            <AppText variant="label">{t('countries.stats.visited')}</AppText>
            <AppText variant={largeText ? 'title' : 'display'} tone="visited">
              {loading ? '—' : formatNumber(stats.visited)}
            </AppText>
            <AppText tone="muted">
              {loading
                ? t('common.loading')
                : t('countries.stats.percentVisited', {
                    percent: formatPercent(stats.percent / 100),
                  })}
            </AppText>
          </Surface>
        </Pressable>
        <View style={styles.totals}>
          {[
            {
              scope: 'wishlist' as const,
              label: t('countries.status.wishlist'),
              value: stats.wishlist,
              color: theme.color.wishlist,
            },
            {
              scope: 'lived' as const,
              label: t('countries.status.lived'),
              value: stats.lived,
              color: theme.color.lived,
            },
            {
              scope: 'not-visited' as const,
              label: t('countries.stats.remaining'),
              value: stats.remaining,
              color: theme.color.accent,
            },
          ].map(({ scope, label, value, color }) => (
            <Statistic
              key={scope}
              value={loading ? '—' : formatNumber(value)}
              label={label}
              largeText={largeText}
              color={color}
              disabled={loading}
              onPress={() => onOpenCountries(scope)}
            />
          ))}
        </View>
        <Surface style={styles.home}>
          <View style={styles.homeLabel}>
            <Icon name="home" color={theme.color.lived} />
            <AppText variant="label">{t('common.currentHome')}</AppText>
          </View>
          {home ? (
            <Button
              label={home.name}
              variant="quiet"
              onPress={() => onOpenCountry(home.id)}
            />
          ) : (
            <Button
              label={t('countries.stats.chooseHome')}
              variant="quiet"
              disabled={loading}
              onPress={onChooseHome}
            />
          )}
        </Surface>
        <AppText variant="heading" accessibilityRole="header">
          {t('countries.byContinent')}
        </AppText>
        <Surface style={styles.continents}>
          {stats.byContinent.map((continent) => (
            <Pressable
              key={continent.id}
              accessibilityRole="button"
              accessibilityLanguage={language}
              accessibilityLabel={t('countries.stats.continentProgress', {
                name: continent.name,
                visited: formatNumber(continent.visited),
                total: formatNumber(continent.total),
              })}
              accessibilityHint={t('countries.stats.continentHint')}
              disabled={loading}
              onPress={() => onOpenCountries('visited', continent.id)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <View accessibilityElementsHidden>
                <ProgressSummary
                  label={continent.name}
                  visited={continent.visited}
                  total={continent.total}
                  loading={loading}
                />
              </View>
            </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  pressed: { opacity: theme.opacity.pressed },
});
