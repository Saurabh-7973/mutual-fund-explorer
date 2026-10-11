import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useOnline } from '@/hooks/useOnline';
import { useSamplePortfolio } from '@/hooks/useSamplePortfolio';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { haptic } from '../ui/haptics';

/** The empty Holdings screen's second way in: a portfolio of real funds to explore. */
export function LoadSampleButton() {
  const { spacing } = useTheme();
  const online = useOnline();
  const { status, load } = useSamplePortfolio();
  const loading = status.state === 'loading';
  return (
    <View style={{ gap: spacing.sm, alignItems: 'center' }}>
      <Button
        label="Explore with a sample portfolio"
        variant="secondary"
        icon="sparkles-outline"
        disabled={!online}
        loading={loading}
        onPress={() => {
          void load().then((ok) => {
            if (ok) haptic.done();
          });
        }}
      />
      {loading ? (
        <AppText variant="caption" tone="muted">
          Pricing from real NAVs…
        </AppText>
      ) : !online ? (
        <AppText variant="caption" tone="muted">
          Connect to the internet to load the sample.
        </AppText>
      ) : status.state === 'error' ? (
        <ErrorState compact error={status.error} onRetry={() => void load()} />
      ) : null}
    </View>
  );
}

/**
 * Shown on Holdings and Watchlist while sample items are saved: a slim bar, not an alert,
 * since nothing is wrong. Clear takes out only what the sample added.
 */
export function SampleBanner() {
  const { colors, radius, spacing } = useTheme();
  const { active, clear } = useSamplePortfolio();
  if (!active) return null;
  return (
    <View
      accessibilityRole="summary"
      style={[styles.bar, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingLeft: spacing.md, gap: spacing.sm }]}
    >
      <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
      <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3} style={styles.flex}>
        Sample portfolio, priced from real NAVs
      </AppText>
      <Pressable
        onPress={() => {
          haptic.tap();
          clear();
        }}
        accessibilityRole="button"
        accessibilityLabel="Clear the sample portfolio"
        hitSlop={8}
        style={({ pressed }) => [styles.clear, { paddingHorizontal: spacing.md, opacity: pressed ? 0.6 : 1 }]}
      >
        <AppText variant="labelStrong" tone="primary" maxFontSizeMultiplier={1.3}>
          Clear
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  flex: { flex: 1, paddingVertical: 6 },
  clear: { minHeight: 44, justifyContent: 'center' },
});
