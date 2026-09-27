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
import { useReducedMotion } from '../motion/ReducedMotion';
import { theme } from '../theme';
import { CountryDetailsContent } from './CountryDetailsContent';

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
  id,
  containerHeight,
  topInset,
  bottomInset,
  autofocus,
  focusRequest,
  onDismiss,
  onPreviewHeightChange,
}: {
  id: string;
  containerHeight: number;
  topInset: number;
  bottomInset: number;
  autofocus: boolean;
  focusRequest?: string;
  onDismiss: () => void;
  onPreviewHeightChange: (height: number) => void;
}) {
  const sheet = useRef<BottomSheet>(null);
  const scroll = useRef<BottomSheetScrollViewMethods>(null);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const expanded = sheetIndex > 0;
  const [previewHeight, setPreviewHeight] = useState(180);
  const reducedMotion = useReducedMotion();
  const availableHeight = containerHeight - topInset - bottomInset;
  const collapsedHeight = Math.min(
    previewHeight + theme.size.touch,
    availableHeight / 2,
  );
  const snapPoints = useMemo(() => [collapsedHeight, '100%'], [collapsedHeight]);
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
        topInset={topInset}
        bottomInset={bottomInset}
        handleComponent={Handle}
        backdropComponent={Backdrop}
        backgroundStyle={styles.background}
        accessible={false}
        overrideReduceMotion={
          reducedMotion ? ReduceMotion.Always : ReduceMotion.Never
        }
        onChange={(index) => {
          if (!sheet.current) return;
          setSheetIndex(index);
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
          <CountryDetailsContent
            id={id}
            onPreviewLayout={({ nativeEvent: { layout } }) =>
              setPreviewHeight(layout.height)
            }
            onToggleDetails={toggle}
            expanded={expanded}
            onDismiss={onDismiss}
            autofocus={autofocus && sheetIndex >= 0}
            onShowMap={collapse}
          />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: theme.color.background },
  handle: { height: theme.size.touch, justifyContent: 'center' },
  indicator: { backgroundColor: theme.color.textMuted },
});
