import { useTranslation } from 'react-i18next';

import { helpUrl, type HelpAnchor } from '@/config/links';
import { openInAppBrowser } from '@/features/legal/hooks';
import { Button } from '@/ui';

/** Opens the "How to play" help center (in the app language) in the in-app browser. */
export function openHelp(language: string | undefined, anchor?: HelpAnchor) {
  openInAppBrowser(helpUrl(language, anchor));
}

/**
 * A small "How does … work?" link to one article of the help center (`/help#anchor`), for empty
 * and help states. The text is passed in, so each place asks its own question.
 */
export function HelpLink({ anchor, title }: { anchor: HelpAnchor; title: string }) {
  const { t, i18n } = useTranslation();
  return (
    <Button
      title={title}
      variant="ghost"
      size="sm"
      icon="help-circle-outline"
      accessibilityHint={t('legal.opensBrowser')}
      onPress={() => openHelp(i18n.language, anchor)}
    />
  );
}
