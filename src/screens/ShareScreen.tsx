import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  PixelRatio,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { Surface } from '../components/Surface';
import { ToggleRow } from '../components/ToggleRow';
import { useAppData } from '../data/AppData';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { PlaceFeedback } from '../places/PlaceFeedback';
import { usePlaces } from '../places/usePlaces';
import { ShareCard } from '../sharing/ShareCard';
import {
  defaultShareOptions,
  getShareContent,
  getSharePlaceIds,
  type ShareOptions,
  type ShareTarget,
} from '../sharing/content';
import { shareCardImage } from '../sharing/share-image';
import { theme } from '../theme';

export function ShareScreen({
  target,
  onClose,
}: {
  target: ShareTarget | null;
  onClose: () => void;
}) {
  const data = useAppData((snapshot) => snapshot.data);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const [options, setOptions] = useState<ShareOptions>(defaultShareOptions);
  const [sharing, setSharing] = useState(false);
  const inFlight = useRef(false);
  const card = useRef<View>(null);
  const layoutVersion = useRef(0);
  const ready = dataStatus === 'ready';
  const resolved = usePlaces(ready ? getSharePlaceIds(data, target, options) : []);
  const content = useMemo(
    () =>
      ready && !resolved.loading && !resolved.error
        ? getShareContent(data, target, options, resolved.places)
        : null,
    [
      ready,
      data,
      target,
      options,
      resolved.loading,
      resolved.error,
      resolved.places,
    ],
  );
  const guard = useActionGuard(content);
  const empty = content?.kind === 'list' && !content.places.length;
  const disabled = busy || sharing;
  const canShare = !!content && !empty && !disabled;

  function close() {
    layoutVersion.current++;
    onClose();
  }

  async function share() {
    if (!canShare || inFlight.current) return;
    const view = card.current;
    if (!view) return;
    inFlight.current = true;
    setSharing(true);
    const current = guard();
    const version = layoutVersion.current;
    const isCurrent = () =>
      current() &&
      version === layoutVersion.current &&
      AppState.currentState === 'active';
    try {
      await shareCardImage(view, PixelRatio.get(), isCurrent);
    } catch (error) {
      if (isCurrent())
        Alert.alert(
          t('sharing.errorTitle'),
          error instanceof UserFacingError
            ? error.message
            : t('sharing.errorMessage'),
        );
    } finally {
      inFlight.current = false;
      setSharing(false);
    }
  }

  return (
    <Screen onAccessibilityEscape={close}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        removeClippedSubviews={false}
        contentContainerStyle={styles.content}
      >
        <ScreenHeader title={t('sharing.title')} compact>
          <Button label={t('common.done')} variant="quiet" onPress={close} />
        </ScreenHeader>
        <DataFeedback />
        <PlaceFeedback
          loading={resolved.loading}
          error={resolved.error}
          onRetry={resolved.retry}
        />
        {content ? (
          <>
            <View
              ref={card}
              collapsable={false}
              onLayout={() => {
                layoutVersion.current++;
              }}
            >
              <ShareCard content={content} />
            </View>
            {empty && (
              <AppText tone="muted">{t('sharing.emptyList')}</AppText>
            )}
          </>
        ) : ready && !resolved.loading && !resolved.error ? (
          <AppText tone="muted">{t('sharing.unavailable')}</AppText>
        ) : null}
        {ready && target && target.kind !== 'stamp' && (
          <Surface>
            <ToggleRow
              title={t('sharing.includeWishlist')}
              value={options.includeWishlist}
              disabled={disabled}
              onValueChange={(includeWishlist) =>
                setOptions((value) => ({ ...value, includeWishlist }))
              }
            />
            {target.kind === 'world' && (
              <ToggleRow
                title={t('sharing.includeHome')}
                value={options.includeHome}
                disabled={disabled}
                onValueChange={(includeHome) =>
                  setOptions((value) => ({ ...value, includeHome }))
                }
              />
            )}
          </Surface>
        )}
      </ScrollView>
      <Button
        style={styles.share}
        label={t(sharing ? 'sharing.preparing' : 'sharing.shareImage')}
        accessibilityState={{ busy: sharing }}
        disabled={!canShare}
        onPress={() => {
          void share();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: theme.space.lg, gap: theme.space.lg },
  share: { marginVertical: theme.space.md },
});
