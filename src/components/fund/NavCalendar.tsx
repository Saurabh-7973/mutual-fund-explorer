import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { shiftMonth } from '@/domain/calendar';
import { formatDate, isoParts } from '@/domain/dates';
import { formatNav, formatPercentHundredths } from '@/domain/format';
import { navMonth, type NavDay } from '@/domain/navCalendar';
import type { NavPoint } from '@/domain/types';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS_5 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKDAYS_7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Tint strength per intensity step: a diverging scale, gain or loss hue, light to strong. */
const TINT = [0.07, 0.16, 0.3, 0.5] as const;
const CELL_HEIGHT = 52;

/**
 * NAV history as a month calendar: each business day with its change, tinted by direction
 * and size, so a month's rhythm (a run of falls, one big day) shows at a glance; tap a day
 * for its NAV. The number is always printed, so colour is never the only signal.
 */
export function NavCalendar({ points }: { points: readonly NavPoint[] }) {
  const { colors, radius, spacing } = useTheme();
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const latest = lastPoint !== undefined ? isoParts(lastPoint.date) : { year: 2000, month: 1 };
  const earliest = firstPoint !== undefined ? isoParts(firstPoint.date) : latest;
  const [cursor, setCursor] = useState({ year: latest.year, month: latest.month });
  const month = useMemo(() => navMonth(points, cursor.year, cursor.month), [points, cursor]);
  const lastInMonth = useMemo(() => {
    const days = month.weeks.flat().filter((day): day is NavDay => day !== null && day.point !== null);
    return days[days.length - 1] ?? null;
  }, [month]);
  const [picked, setPicked] = useState<NavDay | null>(null);
  const selected = picked ?? lastInMonth;

  const key = (y: number, m: number) => y * 12 + m;
  const canBack = key(cursor.year, cursor.month) > key(earliest.year, earliest.month);
  const canForward = key(cursor.year, cursor.month) < key(latest.year, latest.month);
  const move = (by: number) => {
    setCursor((current) => shiftMonth(current.year, current.month, by));
    setPicked(null);
  };
  const outside = (date: string) =>
    (firstPoint !== undefined && date < firstPoint.date) || (lastPoint !== undefined && date > lastPoint.date);
  const weekdays = month.columns === 5 ? WEEKDAYS_5 : WEEKDAYS_7;
  const monthName = MONTHS[cursor.month - 1] ?? '';

  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <View style={styles.flex}>
          <AppText variant="heading">
            {monthName} {cursor.year}
          </AppText>
          {month.change !== null ? (
            <>
              <AppText variant="caption" tone="muted" numeric>
                <AppText variant="caption" numeric tone={month.change.diff < 0n ? 'loss' : 'gain'}>
                  {formatPercentHundredths(month.change.pctHundredths)}
                </AppText>{' '}
                in {monthName}
              </AppText>
              {month.high !== null && month.low !== null && (
                <AppText variant="caption" tone="muted" numeric>
                  High {formatNav(month.high.nav)} · Low {formatNav(month.low.nav)}
                </AppText>
              )}
            </>
          ) : (
            <AppText variant="caption" tone="muted">
              {month.count > 0 ? `${month.count} NAVs, the first month of data` : 'No NAVs this month'}
            </AppText>
          )}
        </View>
        <MonthButton icon="chevron-back" label="Previous month" disabled={!canBack} onPress={() => move(-1)} />
        <MonthButton icon="chevron-forward" label="Next month" disabled={!canForward} onPress={() => move(1)} />
      </View>

      <View style={{ gap: 4 }}>
        <View style={[styles.row, { gap: 4 }]} importantForAccessibility="no-hide-descendants">
          {weekdays.map((day) => (
            <AppText key={day} variant="caption" tone="muted" maxFontSizeMultiplier={1.2} style={[styles.flex, styles.center]}>
              {day}
            </AppText>
          ))}
        </View>
        {month.weeks.map((week, w) => (
          <View key={w} style={[styles.row, { gap: 4 }]}>
            {week.map((day, d) =>
              day === null ? (
                <View key={d} style={styles.cell} />
              ) : outside(day.date) ? (
                // Before the data starts or after the latest NAV: nothing to report, not "no NAV".
                <View key={day.date} style={styles.cell}>
                  <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.2} style={styles.faint}>
                    {isoParts(day.date).day}
                  </AppText>
                </View>
              ) : (
                <DayCell
                  key={day.date}
                  day={day}
                  selected={selected?.date === day.date}
                  onPress={() => setPicked(day)}
                  radius={radius.sm}
                />
              ),
            )}
          </View>
        ))}
      </View>

      {selected !== null && (
        <View style={[styles.detail, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }]}>
          <AppText variant="label" numeric>
            {formatDate(selected.date)}
          </AppText>
          {selected.point !== null ? (
            <AppText variant="caption" tone="muted" numeric>
              NAV {formatNav(selected.point.nav)}
              {selected.change !== null
                ? ` · ${formatPercentHundredths(selected.change.pctHundredths)} from ${formatDate(selected.change.from.date)}`
                : ''}
            </AppText>
          ) : (
            <AppText variant="caption" tone="muted">
              No NAV published (a market holiday, or missing from the data)
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

function DayCell({
  day,
  selected,
  onPress,
  radius,
}: {
  day: NavDay;
  selected: boolean;
  onPress: () => void;
  radius: number;
}) {
  const { colors } = useTheme();
  const { day: dayOfMonth } = isoParts(day.date);
  const down = day.change !== null && day.change.diff < 0n;
  const hue = day.change === null || day.change.diff === 0n ? null : down ? colors.loss : colors.gain;
  const pct = day.change?.pctHundredths ?? 0n;
  const moved = day.change !== null ? `, ${down ? 'down' : 'up'} ${formatPercentHundredths(pct < 0n ? -pct : pct, 'negative-only')}` : '';
  const spoken =
    day.point === null ? `${formatDate(day.date)}, no NAV` : `${formatDate(day.date)}, NAV ${formatNav(day.point.nav)}${moved}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityState={{ selected }}
      style={[
        styles.cell,
        {
          borderRadius: radius,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      {hue !== null && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: hue, opacity: TINT[day.intensity], borderRadius: radius }]} />
      )}
      <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.2}>
        {dayOfMonth}
      </AppText>
      <AppText variant="caption" numeric maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.center}>
        {day.point === null ? '—' : day.change !== null ? formatPercentHundredths(day.change.pctHundredths) : ''}
      </AppText>
    </Pressable>
  );
}

function MonthButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.nav, { opacity: disabled ? 0.3 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  faint: { opacity: 0.5 },
  // A minimum, not a fixed height: at large text sizes the cell grows instead of clipping its figure.
  cell: { flex: 1, minHeight: CELL_HEIGHT, padding: 4, justifyContent: 'space-between', overflow: 'hidden' },
  nav: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  detail: { borderWidth: StyleSheet.hairlineWidth, gap: 2 },
});
