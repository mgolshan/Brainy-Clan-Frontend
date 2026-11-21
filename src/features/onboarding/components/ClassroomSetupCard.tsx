import { router, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/hooks';
import { store } from '@/features/billing/store';
import {
  CLASSROOM_PAYWALL_HREF,
  homeIntentAction,
  useSignupIntent,
} from '@/features/onboarding/signupIntent';
import { Appear, Button, Card, Icon, Text, useTheme } from '@/ui';

/**
 * Home, teacher sign-up (`signupIntent.ts`): right after the class was created, opens the plan
 * picker once with Classroom selected; afterwards (paywall closed, or no store in this build)
 * shows a small "Finish setting up your class" card until the family has the Classroom tier or
 * the teacher dismisses it. App-only state; the owner FTUE checklist applies meanwhile.
 */
export function ClassroomSetupCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const focused = useIsFocused();
  const intent = useSignupIntent((s) => s.intent);
  const stage = useSignupIntent((s) => s.stage);
  const setStage = useSignupIntent((s) => s.setStage);
  const clear = useSignupIntent((s) => s.clear);

  const policy = me?.policy;
  const isAdmin = me?.member ? me.member.role === 'admin' : null;
  const canBuy = store.available && !!policy?.purchases_allowed && !policy.is_child && !!isAdmin;
  const action = me?.family
    ? homeIntentAction({ intent, stage }, { tier: policy?.tier ?? me.family.tier, isAdmin, canBuy })
    : 'none';

  useEffect(() => {
    if (!focused) return;
    if (action === 'clear') clear();
    else if (action === 'openPaywall') {
      // Once: closing the paywall lands back here with the card.
      setStage('finish');
      router.push(CLASSROOM_PAYWALL_HREF);
    }
  }, [action, focused, clear, setStage]);

  if (action !== 'showCard') return null;

  return (
    <Appear>
      <Card variant="tinted" padding="md" style={{ gap: theme.spacing.sm }}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <Icon name="school-outline" color={theme.colors.primary} />
          <Text variant="title" accessibilityRole="header" style={styles.flex}>
            {t('classroomSetup.title')}
          </Text>
        </View>
        <Text tone="muted">
          {canBuy ? t('classroomSetup.body') : t('classroomSetup.bodyNoStore')}
        </Text>
        {canBuy ? (
          <Button
            title={t('classroomSetup.choose')}
            icon="star"
            onPress={() => router.push(CLASSROOM_PAYWALL_HREF)}
          />
        ) : null}
        <Button
          title={t('classroomSetup.dismiss')}
          accessibilityLabel={t('classroomSetup.dismissA11y')}
          variant="ghost"
          size="sm"
          onPress={clear}
        />
      </Card>
    </Appear>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
