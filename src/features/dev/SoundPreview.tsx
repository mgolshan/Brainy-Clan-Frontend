import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { playHaptic, playSound } from '@/features/sound/engine';
import { SOUND_NAMES, SOUND_PACKS } from '@/features/sound/types';
import { useSoundEffects } from '@/features/sound/useSoundEffects';
import { Button, Card, Overline, Screen, Text } from '@/ui';
import { CATEGORY_ART_SLUGS, CategoryArt } from '@/ui/illustrations';

const ART_SIZES = [160, 96, 64] as const;

/**
 * Dev-only (`/dev/sounds`): audition every sound of every world pack (ignores the member's
 * sound toggle) and review the category illustrations at the sizes the cards use.
 */
export function SoundPreview() {
  const { t } = useTranslation();
  const { enabled } = useSoundEffects();

  return (
    <Screen title={t('dev.soundsTitle')} subtitle={t('dev.soundsSubtitle')} back width="wide">
      <Card style={styles.gap}>
        <Text variant="caption">
          {t('dev.soundsYourSetting', { state: enabled ? t('dev.on') : t('dev.off') })}
        </Text>
      </Card>
      {SOUND_PACKS.map((pack) => (
        <Card key={pack} style={styles.gap}>
          <Overline>{t(`dev.packs.${pack}`)}</Overline>
          <View style={styles.row}>
            {SOUND_NAMES.map((name) => (
              <Button
                key={name}
                title={t(`dev.soundNames.${name}`)}
                size="sm"
                variant="secondary"
                fullWidth={false}
                onPress={() => {
                  playSound(pack, name);
                  playHaptic(name);
                }}
              />
            ))}
          </View>
        </Card>
      ))}
      <Card style={styles.gap}>
        <Overline>{t('dev.categoryArt')}</Overline>
        {ART_SIZES.map((size) => (
          <View key={size} style={styles.row}>
            {[...CATEGORY_ART_SLUGS, 'unknown-sub-category'].map((slug) => (
              <CategoryArt key={slug} slug={slug} size={size} />
            ))}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
