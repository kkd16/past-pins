import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '../theme';

const paths = {
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M18 6 6 18',
  search: 'm16 16 4 4',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  compass: 'm16 8-3 5-5 3 3-5 5-3Z',
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
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {name === 'search' && (
        <Circle
          cx={10.5}
          cy={10.5}
          r={6.5}
          fill="none"
          stroke={color}
          strokeWidth={1.7}
        />
      )}
      {name === 'compass' && (
        <Circle
          cx={12}
          cy={12}
          r={10}
          fill="none"
          stroke={color}
          strokeWidth={1.4}
        />
      )}
      <Path
        d={paths[name]}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
