import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppDataProvider';
import { t } from '../localization';
import { arrivalPermissionsGranted, requestArrivalPermission, type ArrivalPermission } from '../location/arrival-permissions';
import { useActionGuard } from '../navigation/useActionGuard';
import { OnboardingPage } from '../onboarding/OnboardingPage';
import { theme } from '../theme';

const steps = {
  location: {
    number: 2,
    title: 'onboarding.locationTitle',
    description: 'onboarding.locationDescription',
    action: 'onboarding.allowLocation',
    icon: 'location',
    next: '/onboarding/background',
  },
  background: {
    number: 3,
    title: 'onboarding.backgroundTitle',
    description: 'onboarding.backgroundDescription',
    action: 'onboarding.allowBackground',
    icon: 'pin',
    next: '/onboarding/notifications',
  },
  notifications: {
    number: 4,
    title: 'onboarding.notificationsTitle',
    description: 'onboarding.notificationsDescription',
    action: 'onboarding.allowNotifications',
    icon: 'bell',
    next: null,
  },
} as const;

type SetupState =
  | { status: 'offer' | 'working' | 'off' }
  | { status: 'retry'; reminders: boolean };

const actionLabels = {
  working: 'onboarding.working',
  off: 'onboarding.startExploring',
  retry: 'common.retry',
} as const;

export function OnboardingPermissionScreen({ permission }: { permission: ArrivalPermission }) {
  const step = steps[permission];
  const app = useAppData();
  const guard = useActionGuard(app.data);
  const running = useRef(false);
  const [setup, setSetup] = useState<SetupState>({ status: 'offer' });
  const working = setup.status === 'working';
  const message = setup.status === 'retry'
    ? t('onboarding.saveError')
    : setup.status === 'off' ? t('onboarding.setupLater') : null;

  useFocusEffect(useCallback(() => {
    if (message)
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, [message]));

  async function finish(requestPermission: boolean) {
    if (running.current || app.busy || app.status !== 'ready') return;
    const focused = guard();
    const isCurrent = () => focused() && appData.getSnapshot().data === app.data;
    if (!isCurrent()) return;
    running.current = true;
    setSetup({ status: 'working' });
    let next: SetupState = { status: 'offer' };
    let enableReminders = setup.status === 'retry' && setup.reminders;
    try {
      if (requestPermission && setup.status !== 'retry') {
        try {
          await requestArrivalPermission(permission, isCurrent);
          if (!isCurrent()) return;
          if (step.next) {
            router.navigate(step.next);
            return;
          }
          // Recheck after the final prompt in case access changed while it was open.
          enableReminders = await arrivalPermissionsGranted();
          if (isCurrent() && !enableReminders) next = { status: 'off' };
          if (!enableReminders) return;
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
      step={step.number}
      title={t(step.title)}
      description={t(step.description)}
      actions={
        <>
          {message && <AppText>{message}</AppText>}
          <Button
            label={t(setup.status === 'offer' ? step.action : actionLabels[setup.status])}
            disabled={disabled}
            accessibilityState={{ busy: working }}
            onPress={() => void finish(setup.status !== 'off')}
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
      <View style={styles.illustration} accessibilityElementsHidden>
        <Icon name={step.icon} size={72} color={theme.color.accent} />
      </View>
    </OnboardingPage>
  );
}

const styles = StyleSheet.create({
  illustration: {
    alignSelf: 'center',
    width: 144,
    height: 144,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
