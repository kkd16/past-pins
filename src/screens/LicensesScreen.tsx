import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import notices from '../../licenses/notices.json';
import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { InfoPage, InfoSection } from '../settings/InfoPage';
import { SettingsRow } from '../settings/SettingsSection';
import { theme } from '../theme';

export function LicensesScreen({
  onSelect,
}: {
  onSelect: (name: string, version: string) => void;
}) {
  const [query, setQuery] = useState('');
  const matches = notices.filter((notice) =>
    notice.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Screen>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search libraries"
        accessibilityLabel="Search libraries"
      />
      <FlatList
        data={matches}
        keyExtractor={(item) => `${item.name}@${item.version}`}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <AppText tone="muted">No matching libraries.</AppText>
        }
        renderItem={({ item }) => (
          <SettingsRow
            title={item.name}
            value={`${item.version} · ${item.license}`}
            onPress={() => onSelect(item.name, item.version)}
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
      <InfoSection title={notice?.name ?? 'License not found'}>
        {notice
          ? `${notice.version} · ${notice.license}`
          : 'This library is not in the installed notices.'}
      </InfoSection>
      {notice && (
        <AppText variant="caption" selectable>
          {notice.text}
        </AppText>
      )}
    </InfoPage>
  );
}

const styles = StyleSheet.create({ list: { paddingVertical: theme.space.lg } });
