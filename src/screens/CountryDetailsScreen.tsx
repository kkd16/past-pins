import type { ComponentProps } from 'react';
import { ScrollView } from 'react-native';

import { CountryDetailsContent } from '../countries/CountryDetailsContent';

export function CountryDetailsScreen(
  props: ComponentProps<typeof CountryDetailsContent>,
) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      onAccessibilityEscape={props.onDismiss}
    >
      <CountryDetailsContent {...props} />
    </ScrollView>
  );
}
