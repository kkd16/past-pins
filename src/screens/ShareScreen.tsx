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
import { useAppData } from '../data/AppDataProvider';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { ShareCard } from '../sharing/ShareCard';
import {
  defaultShareOptions,
  getShareContent,
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
  const app = useAppData();
  const [options, setOptions] = useState<ShareOptions>(defaultShareOptions);
  const [sharing, setSharing] = useState(false);
  const inFlight = useRef(false);
  const root = useRef<View>(null);
  const card = useRef<View>(null);
  const shareButton = useRef<View>(null);
  const layoutVersion = useRef(0);
  const ready = app.status === 'ready';
  const content = useMemo(
    () => (ready ? getShareContent(app.data, target, options) : null),
    [ready, app.data, target, options],
  );
  const guard = useActionGuard(content);
  const empty = content?.kind === 'list' && !content.places.length;
  const disabled = app.busy || sharing;
  const canShare = !!content && !empty && !disabled;

  function close() {
    layoutVersion.current++;
    onClose();
  }

  async function share() {
    if (!canShare || inFlight.current) return;
    const view = card.current;
    const rootView = root.current;
    const buttonView = shareButton.current;
    if (!view || !rootView || !buttonView) return;
    inFlight.current = true;
    setSharing(true);
    const current = guard();
    const version = layoutVersion.current;
    const isCurrent = () =>
      current() &&
      version === layoutVersion.current &&
      AppState.currentState === 'active';
    try {
      await shareCardImage(
        view,
        {
          root: rootView,
          button: buttonView,
          pixelRatio: PixelRatio.get(),
        },
        isCurrent,
      );
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
    <View ref={root} collapsable={false} style={styles.root}>
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
          {content ? (
            <>
              <AppText tone="muted">{t('sharing.previewHint')}</AppText>
              <View
                ref={card}
                collapsable={false}
                onLayout={() => {
                  layoutVersion.current++;
                }}
              >
                <ShareCard content={content} />
              </View>
              {content.kind !== 'stamp' && (
                <Surface>
                  <ToggleRow
                    title={t('sharing.includeWishlist')}
                    description={t(
                      content.kind === 'list'
                        ? 'sharing.listWishlistDescription'
                        : 'sharing.wishlistDescription',
                    )}
                    value={options.includeWishlist}
                    disabled={disabled}
                    onValueChange={(includeWishlist) =>
                      setOptions((value) => ({ ...value, includeWishlist }))
                    }
                  />
                  {content.kind === 'world' && (
                    <ToggleRow
                      title={t('sharing.includeHome')}
                      description={t('sharing.homeDescription')}
                      value={options.includeHome}
                      disabled={disabled}
                      onValueChange={(includeHome) =>
                        setOptions((value) => ({ ...value, includeHome }))
                      }
                    />
                  )}
                </Surface>
              )}
              {content.kind !== 'world' && (
                <AppText variant="caption" tone="muted">
                  {t(
                    content.kind === 'list'
                      ? 'sharing.listPrivacy'
                      : 'sharing.stampPrivacy',
                  )}
                </AppText>
              )}
              {empty && (
                <AppText tone="muted">{t('sharing.emptyList')}</AppText>
              )}
            </>
          ) : ready ? (
            <AppText tone="muted">{t('sharing.unavailable')}</AppText>
          ) : null}
        </ScrollView>
        <View ref={shareButton} collapsable={false} style={styles.actions}>
          <Button
            label={t(sharing ? 'sharing.preparing' : 'sharing.shareImage')}
            accessibilityState={{ busy: sharing }}
            disabled={!canShare}
            onPress={() => {
              void share();
            }}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingVertical: theme.space.lg, gap: theme.space.lg },
  actions: { paddingVertical: theme.space.md },
});
