import { useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { ToggleRow } from '../components/ToggleRow';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppDataProvider';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { SettingsSection } from '../settings/SettingsSection';
import { requestArrivalPermissions } from './arrival-permissions';

export function ArrivalAlertsSetting({ disabled }: { disabled: boolean }) {
  const app = useAppData();
  const guard = useActionGuard(app.data);
  const running = useRef(false);
  const [working, setWorking] = useState(false);

  async function change(enabled: boolean) {
    if (running.current || disabled) return;
    const focused = guard();
    const isCurrent = () => focused() && appData.getSnapshot().data === app.data;
    if (!isCurrent()) return;
    if (!enabled) {
      app.updatePreferences({ countryArrivalAlerts: false });
      return;
    }
    running.current = true;
    setWorking(true);
    try {
      await requestArrivalPermissions(isCurrent);
      if (isCurrent()) app.updatePreferences({ countryArrivalAlerts: true });
    } catch (error) {
      // Permission prompts can outlive the screen that requested them.
      if (!isCurrent()) return;
      Alert.alert(
        t('location.arrivalUnavailable'),
        error instanceof UserFacingError ? error.message : t('common.unknownError'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('location.openSettings'), onPress: () => {
            void Linking.openSettings().catch(() => Alert.alert(
              t('location.arrivalUnavailable'), t('location.arrivalPermissions'),
            ));
          } },
        ],
      );
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  return (
    <SettingsSection title={t('location.arrivalSettingsTitle')}>
      <ToggleRow
        title={t('location.arrivalSetting')}
        description={t('location.arrivalDescription')}
        value={app.data.preferences.countryArrivalAlerts}
        disabled={disabled || working}
        onValueChange={(enabled) => void change(enabled)}
      />
    </SettingsSection>
  );
}
