import { isRunningInExpoGo } from 'expo';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import notices from '../../licenses/notices.json';
import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { t } from '../localization';
import { InfoPage, InfoSection } from '../settings/InfoPage';
import { theme } from '../theme';
import { subdivisionSource } from '../subdivisions/catalog';

const links = [
  { label: 'settings.privacyPolicy', href: 'https://kkd16.github.io/past-pins/privacy/' },
  { label: 'settings.support', href: 'https://kkd16.github.io/past-pins/support/' },
  { label: 'settings.sourceCode', href: 'https://github.com/kkd16/past-pins' },
  { label: 'settings.github', href: 'https://github.com/kkd16' },
  {
    label: 'settings.linkedin',
    href: 'https://www.linkedin.com/in/kyle-deliyannides/',
  },
] as const;

const sources = [
  {
    name: '@rembish/iso-topojson',
    label: 'settings.mapBoundaries',
    href: 'https://github.com/rembish/iso-topojson',
  },
  {
    name: 'countries-list',
    label: 'settings.countryFacts',
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
      <InfoSection title={t('common.appName')}>
        {t('settings.appDescription')}
      </InfoSection>
      <View style={styles.details}>
        <AppText selectable>
          {t('settings.author', { name: 'Kyle Deliyannides' })}
        </AppText>
        <AppText tone="muted" selectable>
          {build
            ? t('settings.versionAndBuild', {
                version: version ?? t('common.unknown'),
                build,
              })
            : t('settings.version', {
                version: version ?? t('common.unknown'),
              })}
        </AppText>
      </View>
      <View>
        {links.map(({ label, href }) => (
          <AboutLink key={href} href={href} label={t(label)} />
        ))}
      </View>
      <InfoSection title={t('settings.appLicense')}>
        {t('settings.licenseSummary')}
      </InfoSection>
      <AboutLink
        href={{
          pathname: '/settings/license',
          params: {
            name: 'PastPins',
            version: notices.find((notice) => notice.name === 'PastPins')!.version,
          },
        }}
        label={t('settings.appLicense')}
      />
      <InfoSection title={t('settings.mapData')}>
        {t('settings.mapAttribution')}
      </InfoSection>
      <View>
        {sources.map(({ name, label, href }) => (
          <AboutLink
            key={name}
            href={href}
            label={t(label, {
              version:
                notices.find((notice) => notice.name === name)?.version ??
                t('common.unknown'),
            })}
          />
        ))}
        <AboutLink
          href="https://creativecommons.org/licenses/by/4.0/"
          label={t('settings.mapLicense')}
        />
      </View>
      <InfoSection title={t('subdivisions.dataTitle')}>
        {t('subdivisions.attribution')}
      </InfoSection>
      <View style={styles.details}>
        <AppText tone="muted" selectable>
          {t('subdivisions.sourceVersion', {
            version: subdivisionSource.version,
          })}
        </AppText>
        <AppText tone="muted" selectable>
          {t('subdivisions.sourceSnapshot', {
            date: subdivisionSource.sourceDate,
          })}
        </AppText>
        <AboutLink
          href="https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/"
          label={t('subdivisions.source')}
        />
        <AboutLink
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          label={t('subdivisions.license')}
        />
      </View>
    </InfoPage>
  );
}

function AboutLink({
  href,
  label,
}: {
  href: Href;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <AppPressable style={styles.link}>
        <AppText tone="accent">{label}</AppText>
      </AppPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  details: { gap: theme.space.xs },
  link: {
    paddingVertical: theme.space.md,
  },
});
