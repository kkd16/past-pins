import { t } from '../../localization';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { theme } from '../../theme';

export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={theme.color.accent}
      backgroundColor={theme.color.surface}
      iconColor={{
        default: theme.color.textMuted,
        selected: theme.color.accent,
      }}
      labelStyle={{
        default: { color: theme.color.textMuted },
        selected: { color: theme.color.accent },
      }}
      minimizeBehavior="never"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger
        name="countries"
        disableAutomaticContentInsets
        contentStyle={{ backgroundColor: theme.color.background }}
      >
        <NativeTabs.Trigger.Label>
          {t('common.countries')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="index"
        disableAutomaticContentInsets
        disableScrollToTop
        contentStyle={{ backgroundColor: theme.color.background }}
      >
        <NativeTabs.Trigger.Label>{t('common.map')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="globe" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="stats"
        disableAutomaticContentInsets
        contentStyle={{ backgroundColor: theme.color.background }}
      >
        <NativeTabs.Trigger.Label>{t('common.stats')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
