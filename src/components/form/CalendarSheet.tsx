import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { monthGrid, monthHasSelectable, openingMonth, shiftMonth } from '@/domain/calendar';
import { formatDate, isoParts } from '@/domain/dates';
import type { IsoDate } from '@/domain/types';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';

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
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface CalendarSheetProps {
  visible: boolean;
  title: string;
  value: IsoDate | null;
  /** Earliest selectable date; null for no lower bound. */
  minimumDate: IsoDate | null;
  /** Latest selectable date (today in India). */
  maximumDate: IsoDate;
  onSelect: (date: IsoDate) => void;
  onClose: () => void;
}

/**
 * The app's own date picker: a bottom sheet in the app's colours instead of the system
 * dialog. Tap the month to jump to a year (a SIP may have started a decade ago); dates
 * outside the fund's data can't be picked; tapping a day picks it and closes.
 */
export function CalendarSheet({
  visible,
  title,
  value,
  minimumDate,
  maximumDate,
  onSelect,
  onClose,
}: CalendarSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [cursor, setCursor] = useState(() => openingMonth(value, maximumDate));
  const [pickingYear, setPickingYear] = useState(false);
  const yearScroll = useRef<ScrollView>(null);

  // Reopen on the chosen month each time the sheet appears.
  useEffect(() => {
    if (visible) {
      setCursor(openingMonth(value, maximumDate));
      setPickingYear(false);
    }
  }, [visible, value, maximumDate]);

  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const firstYear = minimumDate !== null ? isoParts(minimumDate).year : isoParts(maximumDate).year - 40;
  const lastYear = isoParts(maximumDate).year;
  const years = useMemo(
    () => Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i),
    [firstYear, lastYear],
  );
  const prev = shiftMonth(cursor.year, cursor.month, -1);
  const next = shiftMonth(cursor.year, cursor.month, 1);
  const canPrev = monthHasSelectable(prev.year, prev.month, minimumDate, maximumDate);
  const canNext = monthHasSelectable(next.year, next.month, minimumDate, maximumDate);
  const inRange = (date: IsoDate) => date <= maximumDate && (minimumDate === null || date >= minimumDate);

  const pickYear = (year: number) => {
    // Keep the month if it's selectable in that year, else the nearest one that is.
    let target = { year, month: cursor.month };
    if (!monthHasSelectable(year, cursor.month, minimumDate, maximumDate)) {
      const { month: maxMonth } = isoParts(maximumDate);
      const minMonth = minimumDate !== null ? isoParts(minimumDate).month : 1;
      target = { year, month: year === lastYear ? maxMonth : minMonth };
    }
    setCursor(target);
    setPickingYear(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close calendar"
        accessibilityRole="button"
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
            paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm),
            gap: spacing.md,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="label" tone="muted">
              {title}
            </AppText>
            <AppText variant="title">{value !== null ? formatDate(value) : 'Choose a date'}</AppText>
          </View>
        </View>

        {/* Month bar: tap the name for years, arrows for a month either way. */}
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Pressable
            onPress={() => setPickingYear((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`${MONTHS[cursor.month - 1]} ${cursor.year}. ${pickingYear ? 'Close' : 'Choose'} year`}
            style={[styles.row, styles.flex, { gap: spacing.xs, minHeight: MIN_TOUCH }]}
          >
            <AppText variant="heading">
              {MONTHS[cursor.month - 1]} {cursor.year}
            </AppText>
            <Ionicons name={pickingYear ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>
          {!pickingYear && (
            <>
              <NavButton
                icon="chevron-back"
                label="Previous month"
                disabled={!canPrev}
                onPress={() => setCursor(prev)}
              />
              <NavButton
                icon="chevron-forward"
                label="Next month"
                disabled={!canNext}
                onPress={() => setCursor(next)}
              />
            </>
          )}
        </View>

        {pickingYear ? (
          <ScrollView
            ref={yearScroll}
            style={styles.years}
            contentContainerStyle={[styles.yearGrid, { gap: spacing.sm }]}
          >
            {years.map((year) => {
              const selected = year === cursor.year;
              return (
                <Pressable
                  key={year}
                  onPress={() => pickYear(year)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.yearCell,
                    { borderRadius: radius.pill, backgroundColor: selected ? colors.primary : colors.surfaceMuted },
                  ]}
                >
                  <AppText variant="labelStrong" numeric style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {year}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View>
            <View style={styles.week}>
              {WEEKDAYS.map((day, i) => (
                <View key={i} style={styles.cell}>
                  <AppText variant="caption" tone="muted" accessibilityLabel={WEEKDAY_NAMES[i]}>
                    {day}
                  </AppText>
                </View>
              ))}
            </View>
            {weeks.map((week, w) => (
              <View key={w} style={styles.week}>
                {week.map((date, i) => {
                  if (date === null) return <View key={i} style={styles.cell} />;
                  const enabled = inRange(date);
                  const selected = date === value;
                  const isToday = date === maximumDate;
                  return (
                    <Pressable
                      key={date}
                      disabled={!enabled}
                      onPress={() => {
                        onSelect(date);
                        onClose();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${WEEKDAY_NAMES[i]} ${formatDate(date)}${isToday ? ', today' : ''}`}
                      accessibilityState={{ selected, disabled: !enabled }}
                      style={styles.cell}
                    >
                      <View
                        style={[
                          styles.day,
                          {
                            backgroundColor: selected ? colors.primary : 'transparent',
                            borderColor: isToday && !selected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        <AppText
                          variant="label"
                          numeric
                          style={{
                            color: selected ? colors.onPrimary : enabled ? colors.text : colors.border,
                          }}
                        >
                          {isoParts(date).day}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <Button label="Cancel" variant="ghost" onPress={onClose} />
          </View>
          <View style={styles.flex}>
            <Button
              label="Today"
              variant="secondary"
              onPress={() => {
                onSelect(maximumDate);
                onClose();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NavButton({
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
  // A fixed dim over any theme: the sheet is the only lit surface.
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: -4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  nav: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  years: { maxHeight: 6 * MIN_TOUCH },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  yearCell: { width: '30%', minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
