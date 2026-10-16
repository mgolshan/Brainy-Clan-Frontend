import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { LegalInfo } from '@/api/types';
import { openLegalPage, useLegal } from '@/features/legal/hooks';
import { Button, Checkbox, useTheme } from '@/ui';

/** "Terms of use" / "Privacy policy" link buttons; renders nothing without `GET /legal`. */
export function LegalLinks({
  legal,
  align = 'flex-start',
}: {
  legal: LegalInfo | null | undefined;
  align?: 'flex-start' | 'center';
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!legal) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: align,
        gap: theme.spacing.sm,
      }}>
      <Button
        title={t('legal.terms')}
        variant="ghost"
        size="sm"
        fullWidth={false}
        icon="document-text-outline"
        accessibilityHint={t('legal.opensBrowser')}
        onPress={() => openLegalPage(legal.terms.url)}
      />
      <Button
        title={t('legal.privacy')}
        variant="ghost"
        size="sm"
        fullWidth={false}
        icon="shield-checkmark-outline"
        accessibilityHint={t('legal.opensBrowser')}
        onPress={() => openLegalPage(legal.privacy.url)}
      />
    </View>
  );
}

interface AcceptTermsProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Server 422 message on `accept_terms`. */
  error?: string;
}

/**
 * Required "I agree to the Terms and the Privacy Policy" checkbox for adult sign-ups
 * (`accept_terms: true`). The links come from `GET /legal` and open in the in-app browser.
 */
export function AcceptTerms({ checked, onChange, error }: AcceptTermsProps) {
  const { t } = useTranslation();
  const legal = useLegal().data;
  return (
    <View>
      <Checkbox
        label={t('legal.acceptTerms')}
        checked={checked}
        onChange={onChange}
        error={error}
      />
      <LegalLinks legal={legal} />
    </View>
  );
}
