import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { describeScheme } from '@/domain/schemeName';
import { otherPlans } from '@/domain/search';
import { useSchemeSearch } from '@/query/hooks';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { BottomSheet } from '../ui/BottomSheet';
import { haptic } from '../ui/haptics';

/**
 * "Other plans ⌄": the same scheme's other plans and options (Regular, IDCW…), found by
 * searching its name, in a sheet. Hidden when the scheme has none. Picking one opens that
 * plan in place of this one.
 */
export function OtherPlans({ schemeCode, schemeName }: { schemeCode: number; schemeName: string }) {
  const { colors, radius, spacing } = useTheme();
  const title = useMemo(() => describeScheme(schemeName).title, [schemeName]);
  const { query, enabled } = useSchemeSearch(title);
  const plans = useMemo(
    () => (enabled && query.data !== undefined && !query.isPlaceholderData ? otherPlans(query.data, schemeCode, schemeName) : []),
    [enabled, query.data, query.isPlaceholderData, schemeCode, schemeName],
  );
  const [open, setOpen] = useState(false);
  if (plans.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${plans.length} other ${plans.length === 1 ? 'plan' : 'plans'} of this fund`}
        hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <AppText variant="labelStrong" tone="primary" maxFontSizeMultiplier={1.3}>
          Other plans
        </AppText>
        <Ionicons name="chevron-down" size={14} color={colors.primary} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <AppText variant="heading" accessibilityRole="header">
              Other plans of {title}
            </AppText>
            <AppText variant="label" tone="muted">
              Same portfolio; Direct plans skip the distributor's commission, IDCW pays out instead of growing.
            </AppText>
          </View>
          <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, paddingHorizontal: spacing.lg }}>
            {plans.map((plan, i) => {
              const label = describeScheme(plan.schemeName);
              return (
                <Pressable
                  key={plan.schemeCode}
                  accessibilityRole="button"
                  onPress={() => {
                    setOpen(false);
                    router.replace({ pathname: '/fund/[code]', params: { code: String(plan.schemeCode), name: plan.schemeName } });
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: colors.hairline,
                      borderBottomWidth: i === plans.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <AppText variant="rowTitle" maxFontSizeMultiplier={1.3} style={styles.flex}>
                    {[label.plan, label.option].filter((part): part is NonNullable<typeof part> => part !== null).join(' · ') ||
                      plan.schemeName}
                  </AppText>
                  <AppText variant="label" tone="muted" numeric maxFontSizeMultiplier={1.3}>
                    Code {plan.schemeCode}
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
