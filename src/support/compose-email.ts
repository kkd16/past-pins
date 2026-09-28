import * as Application from 'expo-application';
import { Alert, Linking } from 'react-native';

import { t } from '../localization';
import website from '../localization/locales/en/website.json';
import { diagnostics } from '../recovery/diagnostics-file';

let composing = false;
type SupportEmailKind = 'error' | 'bug' | 'feature';

export async function composeSupportEmail(kind: SupportEmailKind, isCurrent: () => boolean) {
  if (composing || !isCurrent()) return;
  composing = true;
  try {
    const consent = await new Promise<boolean>((resolve) => Alert.alert(
      t(`support.${kind}.title`),
      t('support.consent', { details: t(`support.${kind}.details`) }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('support.createEmail'), onPress: () => resolve(true) },
      ],
    ));
    if (!consent || !isCurrent()) return;
    let body = t(`support.${kind}.body`);
    if (kind !== 'feature') {
      const Device = await import('expo-device');
      if (!isCurrent()) return;
      const report = {
        appVersion: Application.nativeApplicationVersion,
        build: Application.nativeBuildVersion,
        device: {
          manufacturer: Device.manufacturer,
          model: Device.modelName,
          os: Device.osName,
          osVersion: Device.osVersion,
        },
        events: kind === 'error' ? await diagnostics.getEvents() : undefined,
      };
      body += `\n\n${JSON.stringify(report, null, 2)}`;
    }
    if (!isCurrent()) return;
    const subject = encodeURIComponent(t(`support.${kind}.subject`));
    const message = encodeURIComponent(body.replace(/\r?\n/g, '\r\n'));
    await Linking.openURL(`mailto:${website.shared.contact}?subject=${subject}&body=${message}`);
  } catch {
    if (isCurrent()) Alert.alert(t('support.emailFailed'), t('support.emailRetry'));
  } finally {
    composing = false;
  }
}
