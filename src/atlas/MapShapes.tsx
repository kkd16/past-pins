import { memo, type Ref } from 'react';
import { Circle, Path, type CircleProps, type PathProps } from 'react-native-svg';

import { theme } from '../theme';

type MapAppearance = Pick<PathProps, 'fill' | 'stroke' | 'strokeWidth'>;

export const MapPath = memo(function MapPath(props: PathProps) {
  return <Path {...props} vectorEffect="non-scaling-stroke" />;
});

export function MapPaths({
  shapes,
  appearance,
  fillRule,
  stroke = theme.globe.border,
  strokeWidth = 0.4,
}: {
  shapes: readonly { id: string; path: string }[];
  appearance: (id: string) => MapAppearance;
  fillRule?: PathProps['fillRule'];
  stroke?: string;
  strokeWidth?: number;
}) {
  return shapes.map(({ id, path }) => (
    <MapPath
      key={id}
      d={path}
      fillRule={fillRule}
      stroke={stroke}
      strokeWidth={strokeWidth}
      {...appearance(id)}
    />
  ));
}

export function MapMarker(props: CircleProps & { ref?: Ref<Circle> }) {
  return <Circle {...props} vectorEffect="non-scaling-stroke" />;
}
