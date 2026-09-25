import * as Sharing from 'expo-sharing';
import type { View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { UserFacingError } from '../data/errors';
import { t } from '../localization';

function measure(view: View) {
  return new Promise<{ width: number; height: number }>((resolve, reject) =>
    view.measure((_, __, width, height) => {
      if (width > 0 && height > 0) resolve({ width, height });
      else reject(new Error('The share view has no layout.'));
    }),
  );
}

export async function shareCardImage(
  view: View,
  pixelRatio: number,
  isCurrent: () => boolean,
) {
  let capture: string | undefined;
  try {
    if (!isCurrent()) return;
    if (!(await Sharing.isAvailableAsync()))
      throw new UserFacingError(t('sharing.sharingUnavailable'));
    if (!isCurrent()) return;
    const { width, height } = await measure(view);
    if (!isCurrent()) return;
    const scale = Math.min(1440 / width, 4096 / height) / pixelRatio;
    capture = (
      await captureRef(view, {
        format: 'png',
        result: 'tmpfile',
        width: width * scale,
        height: height * scale,
      })
    ).replace(/^file:\/\//, '');
    if (!isCurrent()) return;
    await Sharing.shareAsync(`file://${capture}`, { UTI: 'public.png' });
  } finally {
    if (capture)
      await Promise.resolve(capture)
        .then(releaseCapture)
        .catch(() => undefined);
  }
}
