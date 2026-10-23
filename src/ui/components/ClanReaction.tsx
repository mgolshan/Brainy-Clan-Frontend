import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, SvgXml } from 'react-native-svg';

import { clanSvg } from '@/ui/avatars';
import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';
import { withAlpha } from '@/ui/components/Card';
import { Icon } from '@/ui/components/Icon';
import { useTheme } from '@/ui/ThemeProvider';

export type ClanReactionKind = 'cheer' | 'encourage';

interface ClanReactionProps {
  /** The member's avatar key (Ollie the owl when missing / unknown). */
  avatar?: string | null;
  kind: ClanReactionKind;
  size?: number;
}

function sparkle(r: number) {
  const k = r * 0.28;
  return `M${r} 0 Q ${r + k} ${r - k} ${2 * r} ${r} Q ${r + k} ${r + k} ${r} ${2 * r} Q ${r - k} ${
    r + k
  } 0 ${r} Q ${r - k} ${r - k} ${r} 0 Z`;
}

function Pop({
  progress,
  delay,
  children,
  style,
}: {
  progress: SharedValue<number>;
  delay: number;
  children: ReactNode;
  style: object;
}) {
  const s = useAnimatedStyle(() => {
    // Each pop grows in during its own slice of the shared timeline.
    const p = Math.min(1, Math.max(0, (progress.get() - delay) / 0.35));
    return { opacity: p, transform: [{ scale: 0.3 + p * 0.7 }, { translateY: -p * 6 }] };
  });
  return <Animated.View style={[styles.pop, style, s]}>{children}</Animated.View>;
}

/**
 * The member's Clan character reacting to an answer:
 * - `cheer` (correct): jumps for joy with sparkles popping around
 * - `encourage` (wrong): a gentle nod with a little heart ("you'll get the next one")
 * Static with reduced motion (sparkles / heart still shown). Decorative for screen readers.
 */
export const ClanReaction = memo(function ClanReaction({
  avatar,
  kind,
  size = 64,
}: ClanReactionProps) {
  const theme = useTheme();
  const c = theme.colors;
  const still = theme.reducedMotion;
  const y = useSharedValue(0);
  const squash = useSharedValue(1);
  const pops = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) return;
    if (kind === 'cheer') {
      const jump = -size * 0.2;
      y.set(
        withSequence(
          withTiming(jump, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
          withTiming(jump * 0.55, { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 8, stiffness: 260 }),
        ),
      );
      squash.set(
        withSequence(
          withTiming(1, { duration: 330 }),
          withTiming(0.88, { duration: 60 }),
          withSpring(1, { damping: 6, stiffness: 300 }),
        ),
      );
    } else {
      // Two soft nods.
      const nod = size * 0.06;
      y.set(
        withSequence(
          withTiming(nod, { duration: 220 }),
          withTiming(0, { duration: 220 }),
          withTiming(nod, { duration: 220 }),
          withTiming(0, { duration: 260 }),
        ),
      );
    }
    pops.set(withDelay(120, withTiming(1, { duration: 900 })));
  }, [kind, size, still, y, squash, pops]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }, { scaleY: squash.get() }, { scaleX: 2 - squash.get() }],
  }));

  const xml = clanSvg(avatar) ?? CLAN_SVGS.owl;
  const spark = Math.round(size * 0.16);
  const box = size * 1.35;

  return (
    <View
      style={[styles.box, { width: box, height: box }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Animated.View style={body}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: withAlpha(
              kind === 'cheer' ? c.accent : c.heart,
              theme.scheme === 'dark' ? 0.28 : 0.2,
            ),
          }}>
          <SvgXml xml={xml} width={size} height={size} />
        </View>
      </Animated.View>
      {kind === 'cheer' ? (
        <>
          <Pop progress={pops} delay={0} style={{ top: 0, left: 0 }}>
            <Svg width={spark * 2} height={spark * 2}>
              <Path d={sparkle(spark)} fill={c.accent} />
            </Svg>
          </Pop>
          <Pop progress={pops} delay={0.2} style={{ top: box * 0.12, right: 0 }}>
            <Svg width={spark * 1.5} height={spark * 1.5}>
              <Path d={sparkle(spark * 0.75)} fill={c.glow} />
            </Svg>
          </Pop>
          <Pop progress={pops} delay={0.4} style={{ bottom: box * 0.1, right: box * 0.02 }}>
            <Svg width={spark * 1.2} height={spark * 1.2}>
              <Path d={sparkle(spark * 0.6)} fill={c.primary} />
            </Svg>
          </Pop>
        </>
      ) : (
        <Pop progress={pops} delay={0.15} style={{ top: 0, right: 0 }}>
          <Icon name="heart" size={Math.round(size * 0.3)} color={c.heart} />
        </Pop>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  pop: { position: 'absolute' },
});
