import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { ListMap } from '../lists/ListMap';
import { getListRegionPreview } from '../lists/map-preview';
import { formatNumber, language, t } from '../localization';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';
import { getShareMapLabel, type ShareContent } from './content';
import { TravelMap } from './TravelMap';

export function ShareCard({ content }: { content: ShareContent }) {
  const showCredit =
    content.kind !== 'list' ||
    (content.places.length > 0 && !getListRegionPreview(content.places));
  return (
    <View style={styles.card}>
      <AppText variant="label" tone="accent">
        {t('common.appName')}
      </AppText>
      <AppText variant="title" accessibilityRole="header">
        {content.kind === 'world'
          ? t('sharing.worldTitle')
          : content.kind === 'list'
            ? content.name
            : content.country.name}
      </AppText>
      {content.kind === 'world' ? (
        <>
          <AppText variant="heading" tone="accent">
            {t('countries.stats.visitedCount', {
              count: content.stats.visited,
              amount: formatNumber(content.stats.visited),
            })}
          </AppText>
          <TravelMap
            places={content.places}
            accessibilityLabel={getShareMapLabel(content)}
          />
          <View style={styles.legend}>
            {(
              [
                ['visited', content.stats.visited - content.stats.lived],
                ['lived', content.stats.lived],
                ['wishlist', content.stats.wishlist],
              ] as const
            ).map(([status, count]) =>
              count > 0 ? (
                <View key={status} style={styles.legendItem}>
                  <View
                    accessibilityElementsHidden
                    style={[
                      styles.swatch,
                      { backgroundColor: theme.color[status] },
                    ]}
                  />
                  <AppText variant="caption" style={styles.legendLabel}>
                    {t('sharing.legend', {
                      status: t(`countries.status.${status}`),
                      amount: formatNumber(count),
                    })}
                  </AppText>
                </View>
              ) : null,
            )}
          </View>
          {content.homeName && (
            <AppText variant="caption" tone="muted">
              {t('sharing.home', { country: content.homeName })}
            </AppText>
          )}
        </>
      ) : content.kind === 'list' ? (
        <>
          <AppText variant="heading" tone="accent">
            {t('lists.progress', {
              visited: formatNumber(content.visited),
              total: formatNumber(content.places.length),
            })}
          </AppText>
          {content.places.length > 0 && (
            <View
              accessible
              accessibilityRole="image"
              accessibilityLanguage={language}
              accessibilityLabel={getShareMapLabel(content)}
            >
              <View accessibilityElementsHidden>
                <ListMap places={content.places} />
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          <AppText tone="muted">{content.country.continent.name}</AppText>
          <View style={styles.stamp}>
            <CountryStamp
              country={content.country}
              collected={content.collected}
              size="100%"
            />
          </View>
          <AppText variant="heading" tone="accent">
            {t(content.collected ? 'stamps.collected' : 'stamps.notCollected')}
          </AppText>
        </>
      )}
      {showCredit && (
        <View style={styles.credits}>
          <AppText variant="caption" tone="muted" style={styles.credit}>
            {t('sharing.mapCredit')}
          </AppText>
          {content.kind === 'list' && content.places.some(({ kind }) => kind === 'city') && (
            <AppText variant="caption" tone="muted" style={styles.credit}>
              {t('sharing.cityCredit')}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.background,
    padding: theme.space.lg,
    gap: theme.space.lg,
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.border,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    maxWidth: '100%',
  },
  legendLabel: { flexShrink: 1 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  stamp: { alignSelf: 'center', width: '100%', maxWidth: 220, aspectRatio: 1 },
  credit: { fontSize: 11 },
  credits: { gap: theme.space.xs },
});
