import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppDataProvider';
import { t } from '../localization';
import { requestArrivalPermissions } from '../location/arrival-permissions';
import { useActionGuard } from '../navigation/useActionGuard';
import { OnboardingDetail, OnboardingPage } from '../onboarding/OnboardingPage';

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
      <OnboardingDetail
        title={t('onboarding.notificationsTitle')}
        description={t('onboarding.notificationsDescription')}
      />
      <OnboardingDetail
        title={t('onboarding.locationTitle')}
        description={t('onboarding.locationDescription')}
      />
      <AppText variant="caption" tone="muted">{t('onboarding.optional')}</AppText>
    </OnboardingPage>
  );
}
