import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { countryById } from '../countries/catalog';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppDataProvider';
import { language, t } from '../localization';
import { requestArrivalPermissions } from '../location/arrival-permissions';
import { useActionGuard } from '../navigation/useActionGuard';
import { OnboardingPage } from '../onboarding/OnboardingPage';
import { theme } from '../theme';

const previewCountry = countryById.get('jp')!.name;

type SetupState =
  | { status: 'offer' | 'working' | 'off' }
  | { status: 'retry'; reminders: boolean };

const actionLabels = {
  offer: 'onboarding.enableReminders',
  working: 'onboarding.working',
  off: 'onboarding.startExploring',
  retry: 'common.retry',
} as const;

export function RemindersScreen() {
  const app = useAppData();
  const guard = useActionGuard(app.data);
  const running = useRef(false);
  const [setup, setSetup] = useState<SetupState>({ status: 'offer' });
  const working = setup.status === 'working';
  const message = setup.status === 'retry'
    ? t('onboarding.saveError')
    : setup.status === 'off' ? t('onboarding.remindersOff') : null;

  useFocusEffect(useCallback(() => {
    if (message)
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, [message]));

  async function finish(enableReminders: boolean) {
    if (running.current || app.busy || app.status !== 'ready') return;
    const focused = guard();
    const isCurrent = () => focused() && appData.getSnapshot().data === app.data;
    if (!isCurrent()) return;
    running.current = true;
    setSetup({ status: 'working' });
    let next: SetupState = { status: 'offer' };
    try {
      if (enableReminders && setup.status !== 'retry') {
        try {
          await requestArrivalPermissions(isCurrent);
        } catch {
          if (isCurrent()) next = { status: 'off' };
          return;
        }
      }
      if (!isCurrent()) return;
      try {
        await app.completeOnboarding(enableReminders);
      } catch {
        // Retry the same choice, including after returning, without repeating prompts.
        if (appData.getSnapshot().data === app.data)
          next = { status: 'retry', reminders: enableReminders };
      }
    } finally {
      running.current = false;
      setSetup(next);
    }
  }

  const disabled = app.status !== 'ready' || app.busy || working;

  return (
    <OnboardingPage
      step={2}
      title={t('onboarding.remindersTitle')}
      description={t('onboarding.remindersDescription')}
      actions={
        <>
          {message && <AppText>{message}</AppText>}
          <Button
            label={t(actionLabels[setup.status])}
            disabled={disabled}
            accessibilityState={{ busy: working }}
            onPress={() => void finish(setup.status === 'retry' ? setup.reminders : setup.status !== 'off')}
          />
          {setup.status !== 'off' && setup.status !== 'retry' && (
            <Button
              label={t('location.notNow')}
              variant="quiet"
              disabled={disabled}
              onPress={() => void finish(false)}
            />
          )}
        </>
      }
    >
      <View style={styles.preview} accessible accessibilityLanguage={language}>
        <View style={styles.previewHeading}>
          <Icon name="pin" color={theme.color.accent} />
          <AppText variant="caption" tone="muted" style={styles.previewLabel}>
            {t('onboarding.reminderPreview')}
          </AppText>
        </View>
        <AppText variant="heading">
          {t('location.arrivalTitle', { country: previewCountry })}
        </AppText>
        <AppText>{t('location.arrivalBody', { country: previewCountry })}</AppText>
      </View>
      <AppText tone="muted">{t('onboarding.permissions')}</AppText>
      <AppText variant="caption" tone="muted">{t('onboarding.optional')}</AppText>
    </OnboardingPage>
  );
}

const styles = StyleSheet.create({
  preview: { ...theme.surface.floating, padding: theme.space.lg, gap: theme.space.sm },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  previewLabel: { flex: 1 },
});
