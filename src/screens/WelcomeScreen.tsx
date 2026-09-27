import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Checkmark } from '../components/Checkmark';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppData';
import { formatNumber, t } from '../localization';
import { OnboardingPage } from '../onboarding/OnboardingPage';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';

const sampleCountries = ['ca', 'fr', 'jp'].map((id) => countryById.get(id)!);

export function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  const haptics = useAppData((snapshot) => snapshot.data.preferences.haptics);
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const [collected, setCollected] = useState<string[]>([]);

  function toggle(id: string) {
    setCollected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
    if (haptics)
      void Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <OnboardingPage
      step={1}
      title={t('onboarding.welcomeTitle')}
      description={t('onboarding.welcomeDescription')}
      actions={<Button label={t('onboarding.continue')} onPress={onContinue} />}
    >
      <View style={styles.playground}>
        <View style={styles.heading}>
          <AppText variant="heading">
            {collected.length === 0
              ? t('onboarding.tapToStamp')
              : t('onboarding.stampsCollected', {
                count: collected.length,
                amount: formatNumber(collected.length),
              })}
          </AppText>
          <AppText variant="caption" tone="muted">{t('onboarding.previewOnly')}</AppText>
        </View>
        <View style={[styles.stamps, largeText && styles.stampsLarge]}>
          {sampleCountries.map((country, index) => {
            const checked = collected.includes(country.id);
            return (
              <AppPressable
                key={country.id}
                style={[styles.stamp, largeText && styles.stampLarge]}
                accessibilityRole="checkbox"
                accessibilityLabel={t('onboarding.sampleStamp', { country: country.name })}
                accessibilityHint={t(checked ? 'onboarding.removeStampHint' : 'onboarding.collectStampHint')}
                accessibilityState={{ checked }}
                onPress={() => toggle(country.id)}
              >
                <View
                  style={[
                    styles.artwork,
                    largeText && styles.artworkLarge,
                    { transform: [{ rotate: `${(index - 1) * 6}deg` }] },
                  ]}
                  accessibilityElementsHidden
                  pointerEvents="none"
                >
                  <CountryStamp country={country} collected={checked} size="100%" />
                </View>
                <AppText variant="label" style={[styles.country, largeText && styles.countryLarge]}>
                  {country.name}
                </AppText>
                <Checkmark checked={checked} />
              </AppPressable>
            );
          })}
        </View>
      </View>
    </OnboardingPage>
  );
}

const styles = StyleSheet.create({
  playground: { ...theme.surface.panel, padding: theme.space.lg, gap: theme.space.xl },
  heading: { gap: theme.space.xs },
  stamps: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md },
  stampsLarge: { flexDirection: 'column', alignItems: 'stretch' },
  stamp: { flex: 1, minWidth: 0, alignItems: 'center', gap: theme.space.md },
  stampLarge: { flex: 0, flexDirection: 'row', paddingVertical: theme.space.xs },
  artwork: { width: '100%', maxWidth: 112, aspectRatio: 1 },
  artworkLarge: { width: 64, flexShrink: 0 },
  country: { textAlign: 'center' },
  countryLarge: { flex: 1, textAlign: 'auto' },
});
