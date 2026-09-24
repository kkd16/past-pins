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
      accessibilityLabel={label + ': ' + value}
      accessibilityHint="Opens matching countries"
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
        <ScreenHeader
          title="Your world"
          subtitle="Every place, part of your story."
        >
          <IconButton
            name="settings"
            accessibilityLabel="Settings"
            onPress={onOpenSettings}
          />
        </ScreenHeader>
        <DataFeedback />
        <UndoNotice />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            loading
              ? 'Loading places visited'
              : stats.visited + ' places visited'
          }
          accessibilityHint="Opens visited countries"
          disabled={loading}
          onPress={() => onOpenCountries('visited')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Surface style={styles.journey}>
            <AppText variant="label">Places visited</AppText>
            <AppText variant={largeText ? 'title' : 'display'} tone="visited">
              {loading ? '—' : String(stats.visited)}
            </AppText>
            <AppText tone="muted">
              {loading
                ? 'Loading your world…'
                : stats.percent.toFixed(1) + '% of the world’s places'}
            </AppText>
          </Surface>
        </Pressable>
        <View style={styles.totals}>
          {[
            {
              scope: 'wishlist' as const,
              label: 'Wishlist',
              value: stats.wishlist,
              color: theme.color.wishlist,
            },
            {
              scope: 'lived' as const,
              label: 'Places lived',
              value: stats.lived,
              color: theme.color.lived,
            },
            {
              scope: 'not-visited' as const,
              label: 'Places remaining',
              value: stats.remaining,
              color: theme.color.accent,
            },
          ].map(({ scope, label, value, color }) => (
            <Statistic
              key={scope}
              value={loading ? '—' : String(value)}
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
            <AppText variant="label">Current home</AppText>
          </View>
          {home ? (
            <Button
              label={home.name}
              variant="quiet"
              onPress={() => onOpenCountry(home.id)}
            />
          ) : (
            <Button
              label="Choose your home"
              variant="quiet"
              disabled={loading}
              onPress={onChooseHome}
            />
          )}
        </Surface>
        <AppText variant="heading" accessibilityRole="header">
          By continent
        </AppText>
        <Surface style={styles.continents}>
          {stats.byContinent.map((continent) => (
            <Pressable
              key={continent.id}
              accessibilityRole="button"
              accessibilityLabel={
                continent.name +
                ': ' +
                continent.visited +
                ' of ' +
                continent.total +
                ' places visited'
              }
              accessibilityHint="Opens visited countries in this continent"
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
          Progress counts countries and territories in the catalog, not land
          area. Lived places count as visited.
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
