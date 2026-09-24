import type { ViewProps } from 'react-native';

import { formatPercent, language, t } from '../localization';

export function mapAccessibility(
  controller: {
    camera: { width: number; height: number; zoom: number };
    stop: () => void;
    drag: (dx: number, dy: number) => void;
    zoom: (
      zoom: number,
      x: number,
      y: number,
      previousX: number,
      previousY: number,
    ) => void;
  },
  label: string,
): ViewProps {
  const { camera } = controller;
  return {
    accessible: true,
    accessibilityRole: 'adjustable',
    accessibilityLabel: label,
    accessibilityLanguage: language,
    accessibilityHint: t('atlas.exploreHint'),
    accessibilityValue: {
      text: t('atlas.zoom', { value: formatPercent(camera.zoom) }),
    },
    accessibilityActions: [
      { name: 'increment', label: t('atlas.zoomIn') },
      { name: 'decrement', label: t('atlas.zoomOut') },
      { name: 'left', label: t('atlas.moveLeft') },
      { name: 'right', label: t('atlas.moveRight') },
      { name: 'up', label: t('atlas.moveUp') },
      { name: 'down', label: t('atlas.moveDown') },
    ],
    onAccessibilityAction: ({ nativeEvent: { actionName } }) => {
      controller.stop();
      const distance = Math.min(camera.width, camera.height) / 4;
      switch (actionName) {
        case 'increment':
        case 'decrement': {
          const x = camera.width / 2;
          const y = camera.height / 2;
          controller.zoom(
            camera.zoom * (actionName === 'increment' ? 1.25 : 0.8),
            x,
            y,
            x,
            y,
          );
          break;
        }
        case 'left':
          controller.drag(-distance, 0);
          break;
        case 'right':
          controller.drag(distance, 0);
          break;
        case 'up':
          controller.drag(0, -distance);
          break;
        case 'down':
          controller.drag(0, distance);
          break;
      }
    },
  };
}
