import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { InfoPage, InfoSection } from '../settings/InfoPage';
import { theme } from '../theme';

export function CreditsScreen() {
  return (
    <InfoPage>
      <InfoSection title="The world underneath">
        Map data © Alex Rembish, from iso-topojson, based on Natural Earth.
        Licensed under Creative Commons Attribution 4.0. Past Pins transforms
        the source into globe geometry and an Equal Earth map, with its own
        styling and country label placement.
      </InfoSection>
      <Link href="https://github.com/rembish/iso-topojson" style={styles.link}>
        Map source · iso-topojson
      </Link>
      <Link
        href="https://creativecommons.org/licenses/by/4.0/"
        style={styles.link}
      >
        Creative Commons Attribution 4.0
      </Link>
      <Link
        href="https://www.naturalearthdata.com/about/terms-of-use/"
        style={styles.link}
      >
        Natural Earth · public-domain source data
      </Link>
      <InfoSection title="Country facts">
        Country and continent metadata come from Countries by Annexare,
        including capitals, languages, and currency codes. Available details
        follow the source dataset.
      </InfoSection>
      <Link href="https://github.com/annexare/Countries" style={styles.link}>
        Countries by Annexare
      </Link>
      <InfoSection title="Built with open source">
        Expo, React Native, D3, and the libraries listed in Open-source licenses
        make this atlas possible. License notices are included in the app and
        can be read offline.
      </InfoSection>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  link: {
    ...theme.typography.body,
    color: theme.color.accent,
    paddingVertical: theme.space.md,
    textDecorationLine: 'underline',
    minHeight: theme.size.touch,
  },
});
