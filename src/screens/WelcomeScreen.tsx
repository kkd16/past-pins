import { StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { countryById } from '../countries/catalog';
import { t } from '../localization';
import { OnboardingDetail, OnboardingPage } from '../onboarding/OnboardingPage';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';

export function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <OnboardingPage
      title={t('onboarding.welcomeTitle')}
      description={t('onboarding.welcomeDescription')}
      artwork={
        <View style={styles.stamps} accessibilityElementsHidden pointerEvents="none">
          {(['ca', 'fr', 'jp'] as const).map((id, index) => (
            <View key={id} style={[styles.stamp, { transform: [{ rotate: `${(index - 1) * 8}deg` }] }]}>
              <CountryStamp country={countryById.get(id)!} collected size="100%" />
            </View>
          ))}
        </View>
      }
      actions={<Button label={t('onboarding.continue')} onPress={onContinue} />}
    >
      <OnboardingDetail
        title={t('onboarding.findTitle')}
        description={t('onboarding.findDescription')}
      />
      <OnboardingDetail
        title={t('onboarding.markTitle')}
        description={t('onboarding.markDescription')}
      />
      <OnboardingDetail
        title={t('onboarding.exploreTitle')}
        description={t('onboarding.exploreDescription')}
      />
    </OnboardingPage>
  );
}

const styles = StyleSheet.create({
  stamps: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: theme.space.lg,
    gap: theme.space.sm,
  },
  stamp: { width: '28%', maxWidth: 112, aspectRatio: 1 },
});
