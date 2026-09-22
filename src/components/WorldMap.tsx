import world from '@cublya/world-atlas/countries-50m.json';
import { geoGraticule10, geoNaturalEarth1, geoPath, type GeoSphere } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { feature } from 'topojson-client';
import type { GeometryCollection, Objects, Topology } from 'topojson-specification';

import { colors } from '@/theme/tokens';

type CountryProperties = {
  adm0A3?: string;
};

type CountryPath = {
  id: string;
  key: string;
  d: string;
};

type WorldMapProps = {
  /** ISO 3166-1 numeric country identifiers supplied by the atlas dataset. */
  visitedCountryIds: ReadonlySet<string>;
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;
const sphere: GeoSphere = { type: 'Sphere' };

// Natural Earth 5.1.2 data, using the atlas package's documented UN-style boundary view.
const topology = world as unknown as Topology<Objects<CountryProperties>>;
const countriesObject = topology.objects.countries as GeometryCollection<CountryProperties>;
const countries = feature(topology, countriesObject) as FeatureCollection<
  Geometry,
  CountryProperties
>;
const projection = geoNaturalEarth1().fitExtent(
  [
    [8, 8],
    [MAP_WIDTH - 8, MAP_HEIGHT - 8],
  ],
  sphere,
);
const makePath = geoPath(projection);
const spherePath = makePath(sphere);
const graticulePath = makePath(geoGraticule10());
const countryPaths: CountryPath[] = countries.features.flatMap((country, index) => {
  const d = makePath(country);
  const id = String(country.id ?? country.properties?.adm0A3 ?? '');

  return d && id ? [{ d, id, key: `${id}-${index}` }] : [];
});

export function WorldMap({ visitedCountryIds }: WorldMapProps) {
  const accessibilityLabel =
    visitedCountryIds.size === 0
      ? 'World map. No countries marked as visited.'
      : 'World map with visited countries highlighted.';

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={styles.map}>
      <Svg
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        width="100%"
      >
        {spherePath ? (
          <Path
            d={spherePath}
            fill={colors.ocean}
            stroke="rgba(23, 50, 77, 0.18)"
            strokeWidth={2}
          />
        ) : null}

        {graticulePath ? (
          <Path
            d={graticulePath}
            fill="none"
            stroke="rgba(255, 248, 232, 0.2)"
            strokeWidth={1.2}
          />
        ) : null}

        {countryPaths.map(({ d, id, key }) => (
          <Path
            key={key}
            d={d}
            fill={visitedCountryIds.has(id) ? colors.coral : colors.paper}
            stroke={colors.ink}
            strokeLinejoin="round"
            strokeWidth={1.35}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    aspectRatio: MAP_WIDTH / MAP_HEIGHT,
  },
});
