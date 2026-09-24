import { router, Stack } from 'expo-router';

import { Button } from '../../components/Button';
import { SettingsScreen } from '../../screens/SettingsScreen';

export default function SettingsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button
              label="Back"
              variant="quiet"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <SettingsScreen onOpen={(page) => router.push(`/settings/${page}`)} />
    </>
  );
}
