import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { View } from 'react-native';
import type { CaptureOptions } from 'react-native-view-shot';

import { t } from '../src/localization';

const capture = mock(
  async (_view: View, _options: CaptureOptions) =>
    '/tmp/ReactNative/capture.png',
);
const release = mock((_uri: string) => {});
const available = mock(async () => true);
const present = mock(async (_uri: string, _options: unknown) => {});
const measureCard = mock<View['measure']>();
const view = { measure: measureCard } as unknown as View;

mock.module('react-native-view-shot', () => ({
  captureRef: capture,
  releaseCapture: release,
}));
mock.module('expo-sharing', () => ({
  isAvailableAsync: available,
  shareAsync: present,
}));
const { shareCardImage } = await import('../src/sharing/share-image');

beforeEach(() => {
  capture.mockReset().mockResolvedValue('/tmp/ReactNative/capture.png');
  release.mockReset();
  available.mockReset().mockResolvedValue(true);
  present.mockReset().mockResolvedValue(undefined);
  measureCard
    .mockReset()
    .mockImplementation((done) => done(0, 0, 360, 540, 0, 0));
});

describe('native image sharing', () => {
  test('shares the captured PNG and retains it until sheet dismissal', async () => {
    const dismissed = Promise.withResolvers<void>();
    const opened = Promise.withResolvers<void>();
    present.mockImplementation(async () => {
      opened.resolve();
      await dismissed.promise;
    });
    const pending = shareCardImage(view, 3, () => true);
    await opened.promise;
    expect(release).not.toHaveBeenCalled();
    expect(present).toHaveBeenCalledWith(
      'file:///tmp/ReactNative/capture.png',
      {
        UTI: 'public.png',
      },
    );
    dismissed.resolve();
    await pending;
    expect(release).toHaveBeenCalledWith('/tmp/ReactNative/capture.png');
  });

  test('uses fresh native dimensions at each iPhone display density', async () => {
    for (const pixelRatio of [2, 3]) {
      await shareCardImage(view, pixelRatio, () => true);
      const image = capture.mock.calls.at(-1)![1];
      expect(image).toMatchObject({ format: 'png', result: 'tmpfile' });
      expect(image.width! * pixelRatio).toBe(1440);
      expect(image.height! * pixelRatio).toBe(2160);
    }
    measureCard.mockImplementation((done) => done(0, 0, 360, 720, 0, 0));
    await shareCardImage(view, 3, () => true);
    expect(capture.mock.calls.at(-1)![1]).toMatchObject({
      width: 480,
      height: 960,
    });
  });

  test('bounds the full large-text card without cropping or changing proportions', async () => {
    measureCard.mockImplementation((done) => done(0, 0, 320, 2400, 0, 0));
    await shareCardImage(view, 3, () => true);
    const image = capture.mock.calls[0][1];
    expect(image.height! * 3).toBeCloseTo(4096);
    expect(image.width! * 3).toBeLessThanOrEqual(1440);
    expect(image.width! / image.height!).toBeCloseTo(320 / 2400);
  });

  test('rejects missing layouts and can retry after a measurement failure', async () => {
    measureCard.mockImplementationOnce((done) => done(0, 0, 0, 0, 0, 0));
    await expect(shareCardImage(view, 3, () => true)).rejects.toThrow();
    measureCard.mockImplementationOnce(() => {
      throw new Error('Cannot measure');
    });
    await expect(shareCardImage(view, 3, () => true)).rejects.toThrow();
    expect(capture).not.toHaveBeenCalled();
    await shareCardImage(view, 3, () => true);
    expect(present).toHaveBeenCalledTimes(1);
  });

  test('unavailable sharing never captures an image', async () => {
    available.mockResolvedValue(false);
    await expect(shareCardImage(view, 3, () => true)).rejects.toThrow(
      t('sharing.sharingUnavailable'),
    );
    expect(measureCard).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  test('a dismissed preview does not start an export', async () => {
    await shareCardImage(view, 3, () => false);
    expect(available).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  test('dismissal during the availability check prevents measurement and capture', async () => {
    let current = true;
    available.mockImplementation(async () => {
      current = false;
      return true;
    });
    await shareCardImage(view, 3, () => current);
    expect(measureCard).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  test('changed data or layout during measurement cancels capture', async () => {
    let current = true;
    measureCard.mockImplementation((done) => {
      current = false;
      done(0, 0, 360, 540, 0, 0);
    });
    await shareCardImage(view, 3, () => current);
    expect(capture).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
  });

  test('changed data or layout during capture discards the stale image', async () => {
    let current = true;
    capture.mockImplementation(async () => {
      current = false;
      return '/tmp/ReactNative/stale.png';
    });
    await shareCardImage(view, 3, () => current);
    expect(present).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledWith('/tmp/ReactNative/stale.png');
  });

  test('presentation failures release the capture', async () => {
    present.mockRejectedValueOnce(new Error('Cannot present'));
    await expect(shareCardImage(view, 3, () => true)).rejects.toThrow(
      'Cannot present',
    );
    expect(release).toHaveBeenCalledTimes(1);
  });

  test('capture failures do not open the sheet and permit retry', async () => {
    capture.mockRejectedValueOnce(new Error('Capture failed'));
    await expect(shareCardImage(view, 3, () => true)).rejects.toThrow(
      'Capture failed',
    );
    expect(present).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
    await shareCardImage(view, 3, () => true);
    expect(present).toHaveBeenCalledTimes(1);
  });

  test('normalizes file URLs for sharing and the native path-only cleanup API', async () => {
    capture.mockResolvedValue('file:///tmp/ReactNative/capture.png');
    await shareCardImage(view, 3, () => true);
    expect(present.mock.calls[0][0]).toBe(
      'file:///tmp/ReactNative/capture.png',
    );
    expect(release).toHaveBeenCalledWith('/tmp/ReactNative/capture.png');
  });

  test('cleanup failure cannot turn completion or cancellation into a sharing error', async () => {
    release.mockImplementation(() => {
      throw new Error('Already gone');
    });
    await expect(
      shareCardImage(view, 3, () => true),
    ).resolves.toBeUndefined();
  });
});
