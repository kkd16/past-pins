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
const measureCard = mock<View['measureLayout']>();
const measureButton = mock<View['measureLayout']>();
const view = { measureLayout: measureCard } as unknown as View;
const root = {} as View;
const button = { measureLayout: measureButton } as unknown as View;
const options = { root, button, pixelRatio: 3 };

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
  measureCard.mockReset().mockImplementation((_, done) => done(0, 0, 360, 540));
  measureButton
    .mockReset()
    .mockImplementation((_, done) => done(16, 500, 328, 44));
});

describe('native image sharing', () => {
  test('shares the captured PNG with an iPad anchor and retains it until sheet dismissal', async () => {
    const dismissed = Promise.withResolvers<void>();
    const opened = Promise.withResolvers<void>();
    present.mockImplementation(async () => {
      opened.resolve();
      await dismissed.promise;
    });
    const pending = shareCardImage(view, options, () => true);
    await opened.promise;
    expect(release).not.toHaveBeenCalled();
    expect(present).toHaveBeenCalledWith(
      'file:///tmp/ReactNative/capture.png',
      {
        UTI: 'public.png',
        anchor: { x: 16, y: 500, width: 328, height: 44 },
      },
    );
    expect(measureCard.mock.calls[0][0]).toBe(root);
    expect(measureButton.mock.calls[0][0]).toBe(root);
    dismissed.resolve();
    await pending;
    expect(release).toHaveBeenCalledWith('/tmp/ReactNative/capture.png');
  });

  test('uses fresh native dimensions at each device density', async () => {
    for (const pixelRatio of [1, 2, 3]) {
      await shareCardImage(view, { ...options, pixelRatio }, () => true);
      const image = capture.mock.calls.at(-1)![1];
      expect(image).toMatchObject({ format: 'png', result: 'tmpfile' });
      expect(image.width! * pixelRatio).toBe(1440);
      expect(image.height! * pixelRatio).toBe(2160);
    }
    measureCard.mockImplementation((_, done) => done(0, 0, 720, 540));
    await shareCardImage(view, options, () => true);
    expect(capture.mock.calls.at(-1)![1]).toMatchObject({
      width: 480,
      height: 360,
    });
  });

  test('bounds the full large-text card without cropping or changing proportions', async () => {
    measureCard.mockImplementation((_, done) => done(0, 0, 320, 2400));
    await shareCardImage(view, options, () => true);
    const image = capture.mock.calls[0][1];
    expect(image.height! * 3).toBeCloseTo(4096);
    expect(image.width! * 3).toBeLessThanOrEqual(1440);
    expect(image.width! / image.height!).toBeCloseTo(320 / 2400);
  });

  test('rejects missing layouts and can retry after a measurement failure', async () => {
    measureCard.mockImplementationOnce((_, done) => done(0, 0, 0, 0));
    await expect(shareCardImage(view, options, () => true)).rejects.toThrow();
    measureCard.mockImplementationOnce((_, __, fail) => fail!());
    await expect(shareCardImage(view, options, () => true)).rejects.toThrow();
    expect(capture).not.toHaveBeenCalled();
    await shareCardImage(view, options, () => true);
    expect(present).toHaveBeenCalledTimes(1);
  });

  test('unavailable sharing never captures an image', async () => {
    available.mockResolvedValue(false);
    await expect(shareCardImage(view, options, () => true)).rejects.toThrow(
      t('sharing.sharingUnavailable'),
    );
    expect(measureCard).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  test('a dismissed preview does not start an export', async () => {
    await shareCardImage(view, options, () => false);
    expect(available).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  test('dismissal during the availability check prevents measurement and capture', async () => {
    let current = true;
    available.mockImplementation(async () => {
      current = false;
      return true;
    });
    await shareCardImage(view, options, () => current);
    expect(measureCard).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  test('changed data or layout during measurement cancels capture', async () => {
    let current = true;
    measureCard.mockImplementation((_, done) => {
      current = false;
      done(0, 0, 360, 540);
    });
    await shareCardImage(view, options, () => current);
    expect(capture).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
  });

  test('changed data or layout during capture discards the stale image', async () => {
    let current = true;
    capture.mockImplementation(async () => {
      current = false;
      return '/tmp/ReactNative/stale.png';
    });
    await shareCardImage(view, options, () => current);
    expect(measureButton).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledWith('/tmp/ReactNative/stale.png');
  });

  test('the last measurement cannot present after dismissal and releases the image', async () => {
    let current = true;
    measureButton.mockImplementation((_, done) => {
      current = false;
      done(16, 500, 328, 44);
    });
    await shareCardImage(view, options, () => current);
    expect(present).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  test('anchor and presentation failures release the capture', async () => {
    measureButton.mockImplementationOnce((_, __, fail) => fail!());
    await expect(shareCardImage(view, options, () => true)).rejects.toThrow();
    expect(release).toHaveBeenCalledTimes(1);
    expect(present).not.toHaveBeenCalled();
    present.mockRejectedValueOnce(new Error('Cannot present'));
    await expect(shareCardImage(view, options, () => true)).rejects.toThrow(
      'Cannot present',
    );
    expect(release).toHaveBeenCalledTimes(2);
  });

  test('capture failures do not open the sheet and permit retry', async () => {
    capture.mockRejectedValueOnce(new Error('Capture failed'));
    await expect(shareCardImage(view, options, () => true)).rejects.toThrow(
      'Capture failed',
    );
    expect(present).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
    await shareCardImage(view, options, () => true);
    expect(present).toHaveBeenCalledTimes(1);
  });

  test('normalizes file URLs for sharing and the native path-only cleanup API', async () => {
    capture.mockResolvedValue('file:///tmp/ReactNative/capture.png');
    await shareCardImage(view, options, () => true);
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
      shareCardImage(view, options, () => true),
    ).resolves.toBeUndefined();
  });
});
