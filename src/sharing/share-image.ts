import * as Sharing from 'expo-sharing';
import type { View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { UserFacingError } from '../data/errors';
import { t } from '../localization';

function measure(view: View, root: View) {
  return new Promise<{ x: number; y: number; width: number; height: number }>(
    (resolve, reject) =>
      view.measureLayout(
        root,
        (x, y, width, height) => {
          if (width > 0 && height > 0) resolve({ x, y, width, height });
          else reject(new Error('The share view has no layout.'));
        },
        () => reject(new Error('Could not measure the share view.')),
      ),
  );
}

export async function shareCardImage(
  view: View,
  options: {
    root: View;
    button: View;
    pixelRatio: number;
  },
  isCurrent: () => boolean,
) {
  let capture: string | undefined;
  try {
    if (!isCurrent()) return;
    if (!(await Sharing.isAvailableAsync()))
      throw new UserFacingError(t('sharing.sharingUnavailable'));
    if (!isCurrent()) return;
    const { width, height } = await measure(view, options.root);
    if (!isCurrent()) return;
    const scale = Math.min(1440 / width, 4096 / height) / options.pixelRatio;
    capture = (
      await captureRef(view, {
        format: 'png',
        result: 'tmpfile',
        width: width * scale,
        height: height * scale,
      })
    ).replace(/^file:\/\//, '');
    if (!isCurrent()) return;
    const anchor = await measure(options.button, options.root);
    if (!isCurrent()) return;
    await Sharing.shareAsync(`file://${capture}`, {
      UTI: 'public.png',
      anchor,
    });
  } finally {
    if (capture)
      await Promise.resolve(capture)
        .then(releaseCapture)
        .catch(() => undefined);
  }
}
