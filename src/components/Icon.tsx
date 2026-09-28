import { I18nManager } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '../theme';

const paths = {
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  search: 'm16 16 4 4',
  share: 'M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  list: 'M4 5h2M10 5h10M4 11h2M10 11h10M4 17h2M10 17h5M19 14v6M16 17h6',
  chevronRight: 'm9 5 7 7-7 7',
  chevronDown: 'm5 9 7 7 7-7',
  expand: 'M14 4h6v6M20 4l-6 6M10 20H4v-6M4 20l6-6',
  north: 'm12 3 7 17-7-4-7 4Z M12 3v13',
  home: 'm3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10',
  location: 'm21 3-6 18-4-8-8-4Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l.6 3 2.6 1.5L21 7l1 5-2.7 1.5-.6 3L20 19l-4 3-2.4-2h-3.2L8 22l-4-3 1.3-2.5-.6-3L2 12l1-5 2.8.5L8.4 6Z',
} as const;

export type IconProps = {
  name: keyof typeof paths;
  size?: number;
  color?: string;
};

export function Icon({
  name,
  size = theme.size.icon,
  color = theme.color.textMuted,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      style={
        name === 'chevronRight' && I18nManager.isRTL
          ? { transform: [{ scaleX: -1 }] }
          : undefined
      }
    >
      {name === 'search' && (
        <Circle
          cx={10.5}
          cy={10.5}
          r={6.5}
          fill="none"
          stroke={color}
          strokeWidth={theme.stroke.control}
        />
      )}
      <Path
        d={paths[name]}
        fill="none"
        stroke={color}
        strokeWidth={theme.stroke.control}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
