import { isRunningInExpoGo } from 'expo';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import notices from '../../licenses/notices.json';
import { AppText } from '../components/AppText';
import { InfoPage, InfoSection } from '../settings/InfoPage';
import { theme } from '../theme';

const links = [
  { label: 'Source code', href: 'https://github.com/kkd16/past-pins' },
  { label: 'GitHub', href: 'https://github.com/kkd16' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kyle-deliyannides/' },
] as const;

const sources = [
  {
    name: '@rembish/iso-topojson',
    label: 'Map boundaries · iso-topojson',
    href: 'https://github.com/rembish/iso-topojson',
  },
  {
    name: 'countries-list',
    label: 'Country facts · Countries',
    href: 'https://github.com/annexare/Countries',
  },
] as const;

export function AboutScreen() {
  const inExpoGo = isRunningInExpoGo();
  const version = inExpoGo
    ? Constants.expoConfig?.version
    : Application.nativeApplicationVersion;
  const build = inExpoGo ? null : Application.nativeBuildVersion;
  return (
    <InfoPage>
      <InfoSection title="Past Pins">
        Your visited places, homes, and wishlist. Saved on this device.
      </InfoSection>
      <View style={styles.details}>
        <AppText selectable>By Kyle Deliyannides</AppText>
        <AppText tone="muted" selectable>
          Version {version ?? 'Unknown'}
          {build ? ` · Build ${build}` : ''}
        </AppText>
      </View>
      <View>
        {links.map(({ label, href }) => (
          <Link key={href} href={href} style={styles.link}>
            {label}
          </Link>
        ))}
      </View>
      <InfoSection title="Map data">
        Countries and territories, bundled for offline use. Map © Alex Rembish,
        based on Natural Earth. Geometry and styling adapted by Past Pins.
      </InfoSection>
      <View>
        {sources.map(({ name, label, href }) => (
          <Link key={name} href={href} style={styles.link}>
            {label} · {notices.find((notice) => notice.name === name)?.version}
          </Link>
        ))}
        <Link
          href="https://creativecommons.org/licenses/by/4.0/"
          style={styles.link}
        >
          Map license · CC BY 4.0
        </Link>
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  details: { gap: theme.space.xs },
  link: {
    ...theme.typography.body,
    color: theme.color.accent,
    paddingVertical: theme.space.md,
    minHeight: theme.size.touch,
  },
});
