import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetScrollView,
  useBottomSheet,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';

import { AppPressable } from '../components/AppPressable';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus } from '../data/model';
import { formatNumber, t } from '../localization';
import { useReducedMotion } from '../motion/ReducedMotion';
import { PlaceSelectionContent } from '../places/PlaceSelectionCard';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';
import { getSubdivisionStatistics } from '../subdivisions/tracking';
import { theme } from '../theme';
import { CountryDetailsContent } from './CountryDetailsContent';
import type { Country } from './types';

function Handle(props: BottomSheetHandleProps) {
  const { animatedIndex, expand, collapse } = useBottomSheet();
  return (
    <AppPressable
      accessible={false}
      onPress={() => (animatedIndex.value > 0 ? collapse() : expand())}
      style={styles.handle}
    >
      <BottomSheetHandle
        {...props}
        accessible={false}
        indicatorStyle={styles.indicator}
      />
    </AppPressable>
  );
}

function Backdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      accessible={false}
      pressBehavior="collapse"
    />
  );
}

export function CountryMapSheet({
  country,
  containerHeight,
  topInset,
  bottomInset,
  autofocus,
  focusRequest,
  onDismiss,
  onPreviewHeightChange,
  onOpenRegions,
  onSaveToLists,
  onShareStamp,
  onEnlargeStamp,
}: {
  country: Country;
  containerHeight: number;
  topInset: number;
  bottomInset: number;
  autofocus: boolean;
  focusRequest?: string;
  onDismiss: () => void;
  onPreviewHeightChange: (height: number) => void;
  onOpenRegions: (id: string) => void;
  onSaveToLists: (id: string) => void;
  onShareStamp: (id: string) => void;
  onEnlargeStamp: (id: string) => void;
}) {
  const app = useAppData();
  const sheet = useRef<BottomSheet>(null);
  const scroll = useRef<BottomSheetScrollViewMethods>(null);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const expanded = sheetIndex > 0;
  const [previewHeight, setPreviewHeight] = useState(180);
  const reducedMotion = useReducedMotion();
  const availableHeight = containerHeight - topInset - bottomInset;
  // Leave room to expand even when Dynamic Type makes the preview very tall.
  const collapsedHeight = Math.min(
    previewHeight + theme.size.touch,
    availableHeight / 2,
  );
  const snapPoints = useMemo(() => [collapsedHeight, '100%'], [collapsedHeight]);
  const status = getPlaceStatus(app.data, country.id);
  const regions = getSubdivisionStatistics(app.data.subdivisions, country.id);
  const terminology = getCountrySubdivisionTerminology(country.id);
  const collapse = () => sheet.current?.collapse();
  const toggle = () => (expanded ? collapse() : sheet.current?.expand());
  const onEscape = expanded ? collapse : onDismiss;

  useEffect(() => {
    if (focusRequest) sheet.current?.collapse();
  }, [focusRequest]);

  useEffect(() => {
    onPreviewHeightChange(collapsedHeight);
  }, [collapsedHeight, onPreviewHeightChange]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      accessibilityViewIsModal={expanded}
      onAccessibilityEscape={onEscape}
    >
      <BottomSheet
        ref={sheet}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        detached
        topInset={topInset}
        bottomInset={bottomInset}
        handleComponent={Handle}
        backdropComponent={Backdrop}
        style={styles.sheet}
        backgroundStyle={theme.surface.floating}
        accessible={false}
        overrideReduceMotion={
          reducedMotion ? ReduceMotion.Always : ReduceMotion.Never
        }
        onChange={(index) => {
          if (!sheet.current) return;
          setSheetIndex(index);
          // onAnimate can be skipped when Reduce Motion finishes on the UI thread.
          if (index === 0) scroll.current?.scrollTo({ y: 0, animated: false });
        }}
        onClose={() => {
          if (sheet.current) onDismiss();
        }}
      >
        <BottomSheetScrollView
          ref={scroll}
          contentInsetAdjustmentBehavior="never"
          onAccessibilityEscape={onEscape}
        >
          <View
            style={styles.preview}
            onLayout={({ nativeEvent: { layout } }) =>
              setPreviewHeight(layout.height)
            }
          >
            <PlaceSelectionContent
              title={country.name}
              status={status}
              home={app.data.homeCountryId === country.id}
              disabled={app.busy}
              onChangeStatus={(next) => {
                void app.setStatus([country.id], next, {
                  preserveLived: false,
                });
              }}
              onSaveToLists={() => onSaveToLists(country.id)}
              onDetails={toggle}
              expanded={expanded}
              onDismiss={onDismiss}
              onEscape={onEscape}
              autofocus={autofocus && sheetIndex >= 0}
            >
              {regions.total > 0 && (
                <Button
                  label={t('subdivisions.progress', {
                    ...terminology,
                    visited: formatNumber(regions.visited),
                    total: formatNumber(regions.total),
                  })}
                  accessibilityHint={t('subdivisions.openCountry', terminology)}
                  variant="quiet"
                  onPress={() => onOpenRegions(country.id)}
                />
              )}
            </PlaceSelectionContent>
            <DataFeedback />
          </View>
          <View style={styles.details} accessibilityElementsHidden={!expanded}>
            <CountryDetailsContent
              id={country.id}
              showOverview={false}
              onShowMap={collapse}
              onOpenRegions={onOpenRegions}
              onSaveToLists={onSaveToLists}
              onShareStamp={() => onShareStamp(country.id)}
              onEnlargeStamp={() => onEnlargeStamp(country.id)}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { marginHorizontal: theme.space.lg },
  handle: { height: theme.size.touch, justifyContent: 'center' },
  indicator: { backgroundColor: theme.color.textMuted },
  preview: {
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.md,
    gap: theme.space.sm,
  },
  details: {
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.xl,
    gap: theme.space.lg,
  },
});
