import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { holdingsCsv, makeBackup, readBackup } from '@/store/backup';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTheme } from '@/theme/useTheme';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Your data, off the phone and back: everything is stored only on this device, so a
 * backup shared to yourself is how it survives a new phone or a reinstall.
 */
export default function BackupScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const { watchlist, lots } = usePortfolioStore(useShallow((s) => ({ watchlist: s.watchlist, lots: s.lots })));
  const replaceAll = usePortfolioStore((s) => s.replaceAll);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const empty = watchlist.length === 0 && lots.length === 0;

  const shareBackup = () =>
    void Share.share({
      title: 'Mutual Fund Explorer backup',
      message: makeBackup({ watchlist, lots }, new Date().toISOString()),
    });
  const shareCsv = () => void Share.share({ title: 'Holdings (CSV)', message: holdingsCsv(lots) });

  const restore = () => {
    const result = readBackup(pasted);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    const incoming = `${plural(result.data.watchlist.length, 'watched fund', 'watched funds')} and ${plural(result.data.lots.length, 'purchase', 'purchases')}`;
    const current = empty
      ? 'Nothing is saved on this phone yet.'
      : `This replaces the ${plural(watchlist.length, 'watched fund', 'watched funds')} and ${plural(lots.length, 'purchase', 'purchases')} on this phone.`;
    const damaged =
      result.dropped > 0 ? ` ${plural(result.dropped, 'damaged row was', 'damaged rows were')} left out.` : '';
    Alert.alert(`Restore ${incoming}?`, `${current}${damaged}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: empty ? 'default' : 'destructive',
        onPress: () => {
          replaceAll(result.data);
          setPasted('');
          Alert.alert('Restored', `${incoming} are back.`, [{ text: 'OK', onPress: () => router.back() }]);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <AppText tone="muted">
          Your watchlist and holdings are saved only on this phone. Share a backup to yourself (email, notes or a chat
          with yourself) so you can restore it on a new phone.
        </AppText>

        <Card style={{ gap: spacing.md }}>
          <AppText variant="heading" accessibilityRole="header">
            Back up
          </AppText>
          <AppText variant="label" tone="muted">
            {empty
              ? 'Nothing to back up yet.'
              : `${plural(watchlist.length, 'watched fund', 'watched funds')}, ${plural(lots.length, 'purchase', 'purchases')}.`}
          </AppText>
          <Button label="Share backup" icon="share-outline" onPress={shareBackup} disabled={empty} />
          <Button
            label="Share purchases as CSV"
            icon="grid-outline"
            variant="secondary"
            onPress={shareCsv}
            disabled={lots.length === 0}
          />
          <AppText variant="caption" tone="muted">
            The CSV opens in any spreadsheet: one row per purchase with units, the NAV applied and the amount invested.
          </AppText>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <AppText variant="heading" accessibilityRole="header">
            Restore
          </AppText>
          <AppText variant="label" tone="muted">
            Paste the whole backup text, from {'{'} to {'}'}.
          </AppText>
          <TextInput
            value={pasted}
            onChangeText={(text) => {
              setPasted(text);
              setError(null);
            }}
            multiline
            placeholder="Paste your backup here"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Backup text"
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              typography.caption,
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: error !== null ? colors.danger : colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          />
          {error !== null && (
            <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          )}
          <Button label="Restore" variant="secondary" onPress={restore} disabled={pasted.trim() === ''} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: { minHeight: 120, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth },
});
