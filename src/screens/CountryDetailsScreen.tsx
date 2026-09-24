import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Sheet } from '../components/Sheet';
import { Surface } from '../components/Surface';
import { UndoNotice } from '../components/UndoNotice';
import { countryById } from '../countries/catalog';
import { statusOptions } from '../countries/status';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus } from '../data/model';
import { theme } from '../theme';
import { t, formatList, language } from '../localization';

export function CountryDetailsScreen({
  id,
  onDone,
  onShowMap,
}: {
  id: string;
  onDone: () => void;
  onShowMap: (id: string) => void;
}) {
  const app = useAppData();
  const country = countryById.get(id);
  const disabled = app.status !== 'ready' || app.busy;
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
          <Surface
            style={styles.section}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('countries.status.title')}
          >
            <AppText
              variant="label"
              tone="muted"
              accessibilityRole="header"
              style={styles.sectionLabel}
            >
              {t('countries.status.title')}
            </AppText>
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
            <AppText variant="caption" tone="muted" style={styles.sectionLabel}>
              {t('countries.details.livedHint')}
            </AppText>
          </Surface>
          <Surface style={styles.home}>
            <View style={styles.label} accessibilityElementsHidden>
              <AppText variant="label">{t('common.currentHome')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('countries.details.homeHint')}
              </AppText>
            </View>
            <Switch
              hitSlop={theme.space.sm}
              accessibilityLanguage={language}
              accessibilityLabel={t('countries.details.homeLabel', {
                name: country.name,
              })}
              accessibilityHint={t('countries.details.homeHint')}
              value={app.data.homeCountryId === id}
              disabled={disabled}
              onValueChange={(home) => app.setHome(home ? id : null)}
              trackColor={{
                true: theme.color.visitedEmphasis,
                false: theme.color.controlBorder,
              }}
            />
          </Surface>
          <DataFeedback />
          <UndoNotice />
          <Button
            label={t('countries.details.showMap')}
            onPress={() => onShowMap(id)}
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
  section: { padding: theme.space.sm, gap: theme.space.xs },
  sectionLabel: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  home: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    padding: theme.space.lg,
  },
  label: { flex: 1, gap: theme.space.xs },
  facts: { padding: theme.space.lg, gap: theme.space.lg },
  fact: { gap: theme.space.xs },
});
