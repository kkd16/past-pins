import { useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { ToggleRow } from '../components/ToggleRow';
import { appData as app } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { SettingsSection } from '../settings/SettingsSection';
import { requestArrivalPermissions } from './arrival-permissions';

export function ArrivalAlertsSetting({ disabled }: { disabled: boolean }) {
  const data = useAppData((snapshot) => snapshot.data);
  const guard = useActionGuard(data);
  const running = useRef(false);
  const [working, setWorking] = useState(false);

  async function change(enabled: boolean) {
    if (running.current || disabled) return;
    const focused = guard();
    const isCurrent = () => focused() && app.getSnapshot().data === data;
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
        value={data.preferences.countryArrivalAlerts}
        disabled={disabled || working}
        onValueChange={(enabled) => void change(enabled)}
      />
    </SettingsSection>
  );
}
