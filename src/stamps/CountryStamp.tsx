import { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text } from 'react-native-svg';

import type { Country } from '../countries/types';
import { getStampOutline } from './outline';

const inks = ['#315745', '#365870', '#725068'] as const;

/** Decorative artwork; the containing card supplies its native text and label. */
export const CountryStamp = memo(function CountryStamp({
  country,
  collected,
  size = 160,
}: {
  country: Country;
  collected: boolean;
  size?: number | '100%';
}) {
  const seed = country.id.charCodeAt(0) * 31 + country.id.charCodeAt(1);
  const variant = seed % 3;
  const ink = collected ? inks[Math.floor(seed / 3) % inks.length] : '#95A99B';
  const outline = getStampOutline(country.id);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      accessible={false}
      accessibilityElementsHidden
      pointerEvents="none"
      style={{ direction: 'ltr' }}
    >
      <Rect
        x={3}
        y={3}
        width={154}
        height={154}
        rx={5}
        fill={collected ? '#E9E5D7' : '#25352E'}
        stroke={collected ? '#D0D1BC' : '#3B5148'}
        strokeWidth={0.7}
      />
      <G
        rotation={(seed % 7) - 3}
        origin="80, 80"
        stroke={ink}
        fill="none"
        opacity={collected ? 1 : 0.65}
      >
        <G strokeWidth={2} strokeDasharray={collected ? undefined : '4 3'}>
          {variant === 0 ? (
            <Circle cx={80} cy={80} r={65} />
          ) : variant === 1 ? (
            <Path d="M29 16H131L144 29V131L131 144H29L16 131V29Z" />
          ) : (
            <Ellipse cx={80} cy={80} rx={62} ry={67} />
          )}
        </G>
        <G strokeWidth={0.7}>
          {variant === 0 ? (
            <Circle cx={80} cy={80} r={60.5} />
          ) : variant === 1 ? (
            <Path d="M31 21H129L139 31V129L129 139H31L21 129V31Z" />
          ) : (
            <Ellipse cx={80} cy={80} rx={57.5} ry={62.5} />
          )}
          <Path d="M57 33H69M91 33H103M48 110H112" />
        </G>
        <Path d="M80 28L84 33L80 38L76 33Z" fill={ink} stroke="none" />
        {outline ? (
          <G transform={outline.transform}>
            <Path
              d={outline.path}
              fill={collected ? ink : 'none'}
              fillOpacity={0.18}
              fillRule="evenodd"
              strokeWidth={1}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </G>
        ) : (
          <G strokeWidth={1.3}>
            <Path
              d="M80 44a20 20 0 0 0-20 20c0 15 20 34 20 34s20-19 20-34a20 20 0 0 0-20-20Z"
              fill={collected ? ink : 'none'}
              fillOpacity={0.18}
            />
            <Circle cx={80} cy={64} r={6} />
          </G>
        )}
        <Text
          x={80}
          y={131}
          textAnchor="middle"
          fontFamily="Courier"
          fontSize={22}
          fontWeight="700"
          letterSpacing={4}
          fill={ink}
          stroke="none"
        >
          {country.id.toUpperCase()}
        </Text>
      </G>
    </Svg>
  );
});
