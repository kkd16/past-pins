import { useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet } from 'react-native';

import notices from '../../licenses/notices.json';
import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { t } from '../localization';
import { InfoPage, InfoSection } from '../settings/InfoPage';
import { SettingsRow } from '../settings/SettingsSection';
import { theme } from '../theme';

export function LicensesScreen({
  onSelect,
}: {
  onSelect: (name: string, version: string) => void;
}) {
  const [query, setQuery] = useState('');
  const list = useRef<FlatList<(typeof notices)[number]>>(null);
  const search = query.trim().toLowerCase();
  const matches = notices.filter((notice) =>
    notice.name.toLowerCase().includes(search),
  );
  return (
    <Screen>
      <SearchField
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          list.current?.scrollToOffset({ offset: 0, animated: false });
        }}
        placeholder={t('settings.searchLibraries')}
        accessibilityLabel={t('settings.searchLibraries')}
      />
      <FlatList
        ref={list}
        data={matches}
        keyExtractor={(item) => `${item.name}@${item.version}`}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <AppText tone="muted" style={styles.empty}>
            {t('settings.noLibraries')}
          </AppText>
        }
        renderItem={({ item }) => (
          <SettingsRow
            title={item.name}
            disclosure
            value={t('settings.libraryVersion', {
              version: item.version,
              license: item.license,
            })}
            onPress={() => {
              Keyboard.dismiss();
              onSelect(item.name, item.version);
            }}
          />
        )}
      />
    </Screen>
  );
}

export function LicenseScreen({
  name,
  version,
}: {
  name: string;
  version: string;
}) {
  const notice = notices.find(
    (item) => item.name === name && item.version === version,
  );
  return (
    <InfoPage>
      <InfoSection title={notice?.name ?? t('settings.licenseNotFound')}>
        {notice
          ? t('settings.libraryVersion', {
              version: notice.version,
              license: notice.license,
            })
          : t('settings.missingLicense')}
      </InfoSection>
      {notice && (
        <AppText variant="caption" selectable accessibilityLanguage="en">
          {notice.text}
        </AppText>
      )}
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: theme.space.lg },
  empty: { padding: theme.space.xl, textAlign: 'center' },
});
