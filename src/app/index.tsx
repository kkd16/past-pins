import { useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { WorldMap } from '@/components/WorldMap';
import { colors, fonts, spacing, typeStyles } from '@/theme/tokens';

const visitedCountryIds = new Set<string>();

export default function HomeScreen() {
  const [notice, setNotice] = useState('');

  const showNotice = (message: string) => {
    setNotice(message);
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.title}>
              Where have you been?
            </Text>
            <Text style={styles.subtitle}>Mark the countries you’ve visited.</Text>
          </View>

          <View style={styles.worldMap}>
            <WorldMap visitedCountryIds={visitedCountryIds} />
          </View>

          <View style={styles.primaryAction}>
            <PrimaryButton
              label="Add a country"
              onPress={() => showNotice('The country picker comes next.')}
            />
          </View>

          <View style={styles.noticeSlot}>
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.sm,
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingBottom: spacing.xl,
  },
  intro: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typeStyles.title,
    maxWidth: 430,
    color: colors.ink,
  },
  subtitle: {
    ...typeStyles.body,
    maxWidth: 440,
    marginTop: spacing.md,
    color: colors.inkMuted,
  },
  worldMap: {
    marginTop: spacing.lg,
  },
  primaryAction: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  noticeSlot: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  noticeText: {
    color: colors.inkMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
