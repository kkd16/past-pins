import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { ChoiceSection } from '../components/ChoiceSection';
import { DataFeedback } from '../components/DataFeedback';
import { Sheet } from '../components/Sheet';
import { Surface } from '../components/Surface';
import { ToggleRow } from '../components/ToggleRow';
import { countryById } from '../countries/catalog';
import { statusOptions } from '../countries/status';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus, isVisited } from '../data/model';
import { theme } from '../theme';
import { t, formatList, language } from '../localization';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { ProgressSummary } from '../countries/ProgressSummary';

export function CountryDetailsScreen({
  id,
  onDone,
  onShowMap,
  onOpenRegions,
  onSaveToLists,
  onOpenStamp,
}: {
  id: string;
  onDone: () => void;
  onShowMap: (id: string) => void;
  onOpenRegions: (id: string) => void;
  onSaveToLists: (id: string) => void;
  onOpenStamp: (id: string) => void;
}) {
  const app = useAppData();
  const country = countryById.get(id);
  const disabled = app.status !== 'ready' || app.busy;
  const regionStats = getSubdivisionStatistics(app.data.subdivisions, id);
  const facts = country
    ? [
        { label: t('countries.details.capital'), value: country.capital },
        {
          label: t('countries.details.languages'),
          value: formatList(country.languages),
        },
        {
          label: t('countries.details.currencies'),
          value: formatList(country.currencies),
        },
      ].filter(({ value }) => value)
    : [];
  return (
    <Sheet
      title={country?.name ?? t('countries.details.notFound')}
      subtitle={country?.continent.name}
      onDone={onDone}
    >
      {country ? (
        <>
          {regionStats.total > 0 && (
            <Surface style={styles.regions}>
              <ProgressSummary
                kind="subdivisions"
                label={t('subdivisions.title')}
                visited={regionStats.visited}
                total={regionStats.total}
                loading={app.status !== 'ready'}
              />
              <Button
                label={t('subdivisions.explore')}
                onPress={() => onOpenRegions(id)}
              />
            </Surface>
          )}
          <ChoiceSection
            title={t('countries.status.title')}
            description={t('countries.details.livedHint')}
          >
            {statusOptions.map(({ value, label }) => (
              <ChoiceRow
                key={value}
                label={label}
                selected={getPlaceStatus(app.data, id) === value}
                disabled={disabled}
                onPress={() => {
                  void app.setStatus([id], value, { preserveLived: false });
                }}
              />
            ))}
          </ChoiceSection>
          <Surface>
            <ToggleRow
              title={t('common.currentHome')}
              description={t('countries.details.homeHint')}
              accessibilityLabel={t('countries.details.homeLabel', {
                name: country.name,
              })}
              value={app.data.homeCountryId === id}
              disabled={disabled}
              onValueChange={(home) => app.setHome(home ? id : null)}
            />
          </Surface>
          <DataFeedback />
          <Button
            label={t(
              isVisited(getPlaceStatus(app.data, id))
                ? 'stamps.viewStamp'
                : 'stamps.previewStamp',
            )}
            variant="quiet"
            disabled={disabled}
            onPress={() => onOpenStamp(id)}
          />
          <Button
            label={t('countries.details.showMap')}
            onPress={() => onShowMap(id)}
          />
          <Button
            label={t('lists.saveToLists')}
            variant="quiet"
            disabled={disabled}
            onPress={() => onSaveToLists(id)}
          />
          {facts.length > 0 && (
            <Surface style={styles.facts}>
              <AppText variant="heading" accessibilityRole="header">
                {t('countries.details.facts')}
              </AppText>
              {facts.map(({ label, value }) => (
                <View
                  key={label}
                  accessible
                  accessibilityLanguage={language}
                  style={styles.fact}
                >
                  <AppText variant="caption" tone="muted">
                    {label}
                  </AppText>
                  <AppText>{value}</AppText>
                </View>
              ))}
            </Surface>
          )}
        </>
      ) : (
        <AppText tone="muted">{t('countries.details.notInCatalog')}</AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  facts: { padding: theme.space.lg, gap: theme.space.lg },
  fact: { gap: theme.space.xs },
  regions: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.lg },
});
