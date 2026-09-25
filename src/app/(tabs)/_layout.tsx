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
      }}
      labelStyle={{
        default: { color: theme.color.textMuted },
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
          {t('places.title')}
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
        name="lists"
        disableAutomaticContentInsets
        contentStyle={{ backgroundColor: theme.color.background }}
      >
        <NativeTabs.Trigger.Label>{t('lists.title')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }}
        />
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
