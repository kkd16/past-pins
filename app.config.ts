import type { ConfigContext, ExpoConfig } from 'expo/config';

import location from './src/localization/locales/en/location.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-location',
      {
        locationWhenInUsePermission: location.permissionMessage,
        locationAlwaysPermission: false,
        locationAlwaysAndWhenInUsePermission: false,
        motionUsagePermission: false,
      },
    ],
  ],
});
