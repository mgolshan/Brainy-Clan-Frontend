import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, Text, TextField } from '@/ui';

const MONTH_KEYS = [
  'months.jan',
  'months.feb',
  'months.mar',
  'months.apr',
  'months.may',
  'months.jun',
  'months.jul',
  'months.aug',
  'months.sep',
  'months.oct',
  'months.nov',
  'months.dec',
] as const;

interface BirthDateFieldsProps {
  year: string;
  month: number | null;
  onYearChange: (year: string) => void;
  onMonthChange: (month: number) => void;
  yearError?: string;
  monthError?: string;
  hint?: string;
  yearPlaceholder?: string;
}

/**
 * Birth year + month (the design asks for both: year alone misclassifies ages). The app only
 * collects them; the server derives the age band and policy.
 */
export function BirthDateFields({
  year,
  month,
  onYearChange,
  onMonthChange,
  yearError,
  monthError,
  hint,
  yearPlaceholder = '2015',
}: BirthDateFieldsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <TextField
        label={t('forms.birthYear')}
        value={year}
        onChangeText={(v) => onYearChange(v.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        placeholder={yearPlaceholder}
        maxLength={4}
        error={yearError}
        hint={hint}
      />
      <Text variant="label" tone="muted">
        {t('forms.birthMonth')}
      </Text>
      <View style={styles.months} accessibilityRole="radiogroup">
        {MONTH_KEYS.map((key, i) => (
          <Chip
            key={key}
            label={t(key)}
            selected={month === i + 1}
            onPress={() => onMonthChange(i + 1)}
          />
        ))}
      </View>
      {monthError ? (
        <Text variant="caption" tone="danger">
          {monthError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
