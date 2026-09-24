import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatCamera } from '../atlas/FlatCamera';
import { CountryCallout } from '../atlas/CountryCallout';
import type { AtlasCommand } from '../atlas/types';
import { useScreenReaderEnabled } from '../atlas/useScreenReaderEnabled';
import { WorldMapViewport } from '../atlas/WorldMapViewport';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { Surface } from '../components/Surface';
import { UndoNotice } from '../components/UndoNotice';
import { countryById } from '../countries/catalog';
import { getStatusPresentation } from '../countries/status';
import { useAppData } from '../data/AppDataProvider';
import { isVisited } from '../data/model';
import { GlobeCamera } from '../globe/camera';
import { GlobeViewport } from '../globe/GlobeViewport';
import { formatNumber, language, t } from '../localization';
import { theme } from '../theme';

export function MapScreen({
  onSelect,
  onOpenCountries,
  onSearch,
  focus,
  focusRequest,
  onFocusConsumed,
}: {
  onSelect: (id: string) => void;
  onOpenCountries: () => void;
  onSearch: () => void;
  focus?: string;
  focusRequest?: string;
  onFocusConsumed: () => void;
}) {
  const app = useAppData();
  const { data } = app;
  const ready = app.status === 'ready';
  const mode = data.preferences.mapView;
  const [globe] = useState(() => new GlobeCamera());
  const [flat] = useState(() => new FlatCamera());
  const [selection, setSelection] = useState<{
    id: string;
    anchor: readonly number[] | null;
  } | null>(null);
  const [localCommand, setCommand] = useState<AtlasCommand | null>(null);
  const sequence = useRef(0);
  const [topHeight, setTopHeight] = useState(108);
  const [bottomHeight, setBottomHeight] = useState(120);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const screenReader = useScreenReaderEnabled();
  const dockSelection = largeText || screenReader;
  const visited = Object.values(data.places).filter(isVisited).length;
  const focusCountry = useCallback((id: string) => {
    setSelection({ id, anchor: null });
    const key = ++sequence.current;
    setCommand({ type: 'focus', id, key });
  }, []);
  const incomingFocus = useMemo<AtlasCommand | null>(
    () =>
      focus && ready && countryById.has(focus)
        ? {
            type: 'focus',
            id: focus,
            key: `navigation:${focusRequest ?? focus}`,
          }
        : null,
    [focus, focusRequest, ready],
  );
  const command = incomingFocus ?? localCommand;
  const selectedId =
    incomingFocus?.type === 'focus'
      ? incomingFocus.id
      : (selection?.id ?? null);
  const commandApplied = useCallback(
    (key: string | number) => {
      if (incomingFocus?.key === key && incomingFocus.type === 'focus') {
        setSelection({ id: incomingFocus.id, anchor: null });
        onFocusConsumed();
      } else setCommand((current) => (current?.key === key ? null : current));
    },
    [incomingFocus, onFocusConsumed],
  );
  const selectCountry = useCallback(
    (id: string | null, anchor?: readonly number[]) =>
      setSelection(id ? { id, anchor: anchor ?? null } : null),
    [],
  );
  const changeMode = (next: 'globe' | 'map') => {
    if (ready && next !== mode) app.updatePreferences({ mapView: next });
  };
  const viewport = {
    places: data.places,
    homeCountryId: data.homeCountryId,
    selectedId,
    selectedAnchor: incomingFocus ? null : (selection?.anchor ?? null),
    labels: data.preferences.countryLabels,
    dockSelection,
    command,
    topInset: insets.top + topHeight + theme.space.md,
    bottomInset: insets.bottom + bottomHeight + theme.space.md,
    onSelect: selectCountry,
    onDetails: onSelect,
    onCommandApplied: commandApplied,
  };

  return (
    <View style={styles.screen}>
      {ready &&
        (mode === 'globe' ? (
          <GlobeViewport {...viewport} camera={globe} />
        ) : (
          <WorldMapViewport {...viewport} camera={flat} />
        ))}
      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: insets.top + theme.space.sm }]}
      >
        <ScrollView
          style={styles.topScroll}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          onLayout={({ nativeEvent: { layout } }) =>
            setTopHeight(layout.height + theme.space.sm)
          }
        >
          <View style={styles.topContent}>
            <View style={styles.toolbar}>
              <Surface variant="floating" style={styles.mode}>
                {largeText ? (
                  <View style={styles.modeStack}>
                    {(['globe', 'map'] as const).map((value) => (
                      <Button
                        key={value}
                        label={
                          value === 'globe'
                            ? t('atlas.globe')
                            : t('atlas.worldMap')
                        }
                        onPress={() => changeMode(value)}
                        accessibilityState={{ selected: mode === value }}
                        disabled={!ready || app.busy}
                        variant={mode === value ? 'primary' : 'quiet'}
                      />
                    ))}
                  </View>
                ) : (
                  <SegmentedControl
                    style={{ height: theme.size.touch }}
                    values={[t('atlas.globe'), t('atlas.worldMap')]}
                    accessibilityLabel={t('atlas.mapView')}
                    accessibilityLanguage={language}
                    selectedIndex={mode === 'globe' ? 0 : 1}
                    enabled={ready && !app.busy}
                    appearance={theme.appearance.colorScheme}
                    tintColor={theme.color.accent}
                    backgroundColor={theme.color.surface}
                    fontStyle={{ color: theme.color.textMuted }}
                    activeFontStyle={{ color: theme.color.onAccent }}
                    onChange={({ nativeEvent }) =>
                      changeMode(
                        nativeEvent.selectedSegmentIndex === 0
                          ? 'globe'
                          : 'map',
                      )
                    }
                  />
                )}
              </Surface>
              <IconButton
                name="search"
                accessibilityLabel={t('atlas.findCountry')}
                onPress={onSearch}
                style={styles.control}
              />
            </View>
            <View style={styles.actions}>
              {data.homeCountryId && (
                <IconButton
                  name="home"
                  accessibilityLabel={t('atlas.goHome')}
                  onPress={() => focusCountry(data.homeCountryId!)}
                  style={styles.control}
                />
              )}
              {mode === 'globe' && (
                <IconButton
                  name="north"
                  accessibilityLabel={t('atlas.northUp')}
                  onPress={() =>
                    setCommand({ type: 'north', key: ++sequence.current })
                  }
                  style={styles.control}
                />
              )}
              <IconButton
                name="reset"
                accessibilityLabel={
                  mode === 'globe' ? t('atlas.resetGlobe') : t('atlas.fitWorld')
                }
                onPress={() =>
                  setCommand({ type: 'reset', key: ++sequence.current })
                }
                style={styles.control}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      <View
        pointerEvents="box-none"
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + theme.space.sm },
        ]}
      >
        <ScrollView
          style={styles.footerScroll}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          onLayout={({ nativeEvent: { layout } }) =>
            setBottomHeight(layout.height + theme.space.sm)
          }
        >
          <View style={styles.footer}>
            {ready && dockSelection && selectedId && (
              <CountryCallout
                countryId={selectedId}
                status={data.places[selectedId]}
                home={data.homeCountryId === selectedId}
                onDetails={onSelect}
                onDismiss={() => selectCountry(null)}
                autofocus={screenReader}
              />
            )}
            <DataFeedback />
            <UndoNotice />
            {ready && data.preferences.mapSummary && (
              <Surface variant="floating" style={styles.summary}>
                <View
                  accessible
                  accessibilityLanguage={language}
                  accessibilityLabel={t('atlas.visitedCount', {
                    count: visited,
                    total: formatNumber(visited),
                  })}
                  style={styles.summaryHeading}
                >
                  <AppText variant="number" tone="visited">
                    {formatNumber(visited)}
                  </AppText>
                  <View style={styles.summaryText}>
                    <AppText variant="label">
                      {t('atlas.placesVisited')}
                    </AppText>
                    {!screenReader && (
                      <AppText variant="caption" tone="muted">
                        {mode === 'globe'
                          ? t('atlas.globeGestures')
                          : t('atlas.mapGestures')}
                      </AppText>
                    )}
                  </View>
                </View>
                <View style={styles.legend}>
                  {(['visited', 'wishlist', 'lived'] as const).map((status) => {
                    const presentation = getStatusPresentation(status);
                    return (
                      <View key={status} style={styles.legendItem}>
                        <Icon
                          name={presentation.icon}
                          color={presentation.color}
                          size={theme.size.iconSmall}
                        />
                        <AppText
                          variant="caption"
                          style={{ color: presentation.color }}
                        >
                          {presentation.label}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
                {!Object.keys(data.places).length && (
                  <Button
                    label={t('atlas.addPlace')}
                    onPress={onOpenCountries}
                    variant="quiet"
                  />
                )}
              </Surface>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    paddingHorizontal: theme.space.lg,
  },
  topScroll: { flexGrow: 0 },
  topContent: {
    gap: theme.space.sm,
    maxWidth: theme.size.contentMax,
    width: '100%',
    alignSelf: 'center',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  mode: { flex: 1, padding: theme.space.xs },
  modeStack: { gap: theme.space.xs },
  actions: { flexDirection: 'row', gap: theme.space.sm, alignSelf: 'flex-end' },
  control: { ...theme.surface.floating, borderRadius: theme.radius.pill },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '40%',
    paddingHorizontal: theme.space.lg,
  },
  footerScroll: { flexGrow: 0 },
  footer: {
    gap: theme.space.sm,
    maxWidth: theme.size.contentMax,
    width: '100%',
    alignSelf: 'center',
  },
  summary: { padding: theme.space.md, gap: theme.space.md },
  summaryHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.md,
  },
  summaryText: { flex: 1, minWidth: 150, gap: theme.space.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
});
