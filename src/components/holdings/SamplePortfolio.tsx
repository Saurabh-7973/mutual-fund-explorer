import { View } from 'react-native';

import { useOnline } from '@/hooks/useOnline';
import { useSamplePortfolio } from '@/hooks/useSamplePortfolio';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Banner } from '../ui/Banner';
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

/** Shown on Holdings and Watchlist while sample items are saved, with a way to take them out. */
export function SampleBanner() {
  const { active, clear } = useSamplePortfolio();
  if (!active) return null;
  return (
    <Banner
      tone="info"
      text="Sample portfolio, priced from real NAVs"
      action={{
        label: 'Clear',
        onPress: () => {
          haptic.tap();
          clear();
        },
      }}
    />
  );
}
