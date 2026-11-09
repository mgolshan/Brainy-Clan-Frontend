import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Divider, Icon, ListRow, Text, useTheme } from '@/ui';

interface SupportEntryProps {
  /** Family admins can write to support (the reply goes to their account email). */
  isAdmin: boolean;
  /** From the member policy: children are told to ask a parent. */
  isChild: boolean;
  onPress: () => void;
}

/**
 * Profile → About: "Contact support" for family admins; everyone else gets one line telling them
 * to ask a family admin (a parent, for children). Starts with a divider (it follows a row).
 */
export function SupportEntry({ isAdmin, isChild, onPress }: SupportEntryProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <>
      <Divider />
      {isAdmin ? (
        <ListRow
          title={t('support.entryTitle')}
          subtitle={t('support.entrySubtitle')}
          leading={<Icon name="chatbubbles-outline" color={theme.colors.primary} />}
          onPress={onPress}
        />
      ) : (
        <View
          testID="support-ask-admin"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.sm,
          }}>
          <Icon name="chatbubbles-outline" color={theme.colors.textMuted} />
          <Text tone="muted" style={{ flex: 1 }}>
            {isChild ? t('support.askParent') : t('support.askAdmin')}
          </Text>
        </View>
      )}
    </>
  );
}
