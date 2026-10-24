import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';

import type { SpotDifferencePayload, SpotDifferenceResponse, SpotObject } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import type { ChallengeComponentProps } from '@/challenges/registry';
import {
  MAX_TAPS,
  applyChanges,
  changeCircle,
  hitTest,
  isSpotProp,
  locateInPair,
  normalizeTap,
  objectCenterTap,
  readChangeIds,
  readTaps,
  scoreTaps,
} from '@/challenges/spot/logic';
import { propSvg, spotFill, spotShade } from '@/challenges/spot/props';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import { Badge, Button, Chip, Text, useTheme, useUiSound, withAlpha } from '@/ui';
import { clanSvg, isAvatarKey, parseAvatarKey } from '@/ui/avatars';

interface Draft {
  taps: [number, number][];
}

/** Below this container width the pictures are stacked (portrait phones). */
const STACK_BELOW = 520;

const webNoSelect =
  Platform.OS === 'web'
    ? ({
        touchAction: 'manipulation',
        userSelect: 'none',
        cursor: 'crosshair',
      } as unknown as ViewStyle)
    : null;

/** One object of a picture, centred on (x, y) with a box of `size` × picture width. */
const SpotThing = memo(function SpotThing({
  object,
  width,
}: {
  object: SpotObject;
  width: number;
}) {
  const box = object.size * width;
  const style = {
    left: object.x * width - box / 2,
    top: object.y * width - box / 2,
    width: box,
    height: box,
    transform: object.flip ? [{ scaleX: -1 }] : undefined,
  };
  if (isSpotProp(object.kind)) {
    return (
      <View pointerEvents="none" style={[styles.thing, style]}>
        <SvgXml xml={propSvg(object.kind, object.color)} width={box} height={box} />
      </View>
    );
  }
  // Clan kid avatars (or an unknown kind): a disc in the object's color.
  const xml = isAvatarKey(object.kind) ? clanSvg(object.kind) : null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.thing,
        styles.disc,
        style,
        {
          borderRadius: box / 2,
          backgroundColor: spotFill(object.color),
          borderColor: spotShade(object.color),
          borderWidth: Math.max(1.5, box * 0.04),
        },
      ]}>
      {xml ? <SvgXml xml={xml} width={box * 0.98} height={box * 0.98} /> : null}
    </View>
  );
});

/** Ring around a change (found: solid; missed after scoring: dashed). */
function Ring({
  x,
  y,
  r,
  color,
  dashed,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  dashed?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
          backgroundColor: withAlpha(color, 0.12),
        },
      ]}
    />
  );
}

/**
 * `spot_difference`: two pictures drawn from the same `objects` (Clan kid avatars and props);
 * the right one (bottom on portrait phones) has the `changes` applied. Tap a difference in either
 * picture: a local hit-test that mirrors the contract circles it at once in both pictures; a miss
 * shows a small ✕. Every tap is recorded (normalized 0–1 within the tapped picture) and
 * `{ taps }` is submitted when every change is found or the misses run over `max_misses`.
 * Screen-reader users get a list of the objects with an "Is this different?" button each.
 */
export function SpotDifference({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<SpotDifferencePayload, SpotDifferenceResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const sound = useUiSound();
  const payload = item.payload;
  const { aspect, objects, changes, max_misses: maxMisses } = payload;
  const right = useMemo(() => applyChanges(objects, changes), [objects, changes]);

  const initial = useMemo<Draft>(() => ({ taps: [] }), []);
  const isDraft = useCallback(
    (v: unknown): v is Draft =>
      typeof v === 'object' &&
      v !== null &&
      Array.isArray((v as Draft).taps) &&
      readTaps(v).length === (v as Draft).taps.length,
    [],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('spot_difference', item.id),
    initial,
    isDraft,
  );
  const [width, onLayout] = useMeasuredWidth();
  const win = useWindowDimensions();
  const screenReader = useScreenReaderEnabled();
  const [listMode, setListMode] = useState(false);
  const [lastMiss, setLastMiss] = useState<{ side: 0 | 1; x: number; y: number } | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const locked = !!disabled || !!pending || !!result;
  const taps = result ? readTaps(result.submitted) : pending ? readTaps(pending) : draft.taps;
  const { found, misses } = useMemo(() => scoreTaps(taps, payload), [taps, payload]);
  const total = changes.length;
  const allFound = found.length === total;
  const over = misses > maxMisses;
  const solutionIds = result ? readChangeIds(result.correctResponse) : [];
  const revealIds = result
    ? (solutionIds.length ? solutionIds : changes.map((ch) => ch.id)).filter(
        (id) => !found.includes(id),
      )
    : [];

  // Done (every change found, too many misses, or the tap cap): submit after a short beat so the
  // last ring or ✕ shows first.
  const finished = !result && !pending && (allFound || over || draft.taps.length >= MAX_TAPS);
  useEffect(() => {
    if (!finished || disabled || draft.taps.length === 0) return;
    const timer = setTimeout(() => onSubmit({ taps: draft.taps }), 600);
    return () => clearTimeout(timer);
  }, [finished, disabled, onSubmit, draft.taps]);

  useEffect(() => {
    if (!lastMiss) return;
    const timer = setTimeout(() => setLastMiss(null), 900);
    return () => clearTimeout(timer);
  }, [lastMiss]);

  /** One tap, normalized within its picture. */
  const tapAt = (tap: [number, number], side: 0 | 1) => {
    if (locked || finished) return;
    const id = hitTest(tap, payload);
    if (id && found.includes(id)) {
      setAnnounce(t('challenge.spot.alreadyFound'));
      return; // already circled: neither a find nor a miss
    }
    setDraft((d) => ({ taps: [...d.taps, tap] }));
    if (id) {
      sound('correct');
      setLastMiss(null);
      setAnnounce(t('challenge.spot.foundAnnounce', { found: found.length + 1, total }));
    } else {
      sound('wrong');
      setLastMiss({ side, x: tap[0], y: tap[1] });
      setAnnounce(t('challenge.spot.missAnnounce', { misses: misses + 1, max: maxMisses }));
    }
  };

  // --- layout
  const stacked = width > 0 && width < STACK_BELOW;
  const gap = theme.spacing.sm;
  let pw = width ? (stacked ? width : Math.floor((width - gap) / 2)) : 0;
  // Landscape (iPad sideways, desktop): keep both pictures and the counters on one screen.
  if (pw && win.width > win.height) {
    const maxHeight = win.height - theme.touchTarget * 3 - 200;
    pw = Math.max(160, Math.min(pw, Math.floor(maxHeight * aspect)));
  }
  const ph = Math.round(pw / aspect);
  const picture = { width: pw, height: ph };

  const gesture = Gesture.Tap()
    .runOnJS(true)
    .enabled(!locked && pw > 0)
    .maxDistance(12)
    .onEnd((e, success) => {
      if (!success) return;
      const at = locateInPair(e.x, e.y, picture, gap, stacked);
      if (at) tapAt(normalizeTap(at.x, at.y, pw, ph), at.side);
    });

  const ringColor = c.success;
  const renderPicture = (side: 0 | 1) => {
    const list = side === 0 ? objects : right;
    return (
      <View
        key={side}
        style={[
          styles.picture,
          {
            width: pw,
            height: ph,
            borderRadius: theme.radius.md,
            borderColor:
              result && side === 1 ? (result.isCorrect ? c.success : c.danger) : c.borderStrong,
            borderWidth: theme.key === 'classic' ? 2 : theme.borderWidth || 1,
            backgroundColor: c.backgroundAlt,
          },
        ]}>
        {/* World-tinted ground band behind the art. */}
        <View
          style={[
            styles.ground,
            { height: ph * 0.34, backgroundColor: withAlpha(c.surfaceAlt, 0.95) },
          ]}
        />
        <View style={[styles.horizon, { top: ph * 0.66, backgroundColor: c.border }]} />
        {list.map((o) => (
          <SpotThing key={o.id} object={o} width={pw} />
        ))}
        {found.map((id) => {
          const ch = changes.find((x) => x.id === id);
          const circle = ch ? changeCircle(ch, objects) : null;
          return circle ? (
            <Ring
              key={`f-${id}`}
              x={circle.x * pw}
              y={circle.y * pw}
              r={circle.r * pw}
              color={ringColor}
            />
          ) : null;
        })}
        {revealIds.map((id) => {
          const ch = changes.find((x) => x.id === id);
          const circle = ch ? changeCircle(ch, objects) : null;
          return circle ? (
            <Ring
              key={`m-${id}`}
              x={circle.x * pw}
              y={circle.y * pw}
              r={circle.r * pw}
              color={c.danger}
              dashed
            />
          ) : null;
        })}
        {lastMiss && lastMiss.side === side ? (
          <View
            pointerEvents="none"
            style={[
              styles.miss,
              {
                left: lastMiss.x * pw - 14,
                top: lastMiss.y * ph - 14,
                backgroundColor: c.dangerSoft,
                borderColor: c.danger,
              },
            ]}>
            <Text weight="bold" color={c.danger} maxFontSizeMultiplier={1} style={styles.missText}>
              ✕
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const kindName = (kind: string) => {
    const species = parseAvatarKey(kind)?.species;
    if (species) return t(`avatars.${species}`);
    return isSpotProp(kind) ? t(`challenge.spot.kinds.${kind}`) : t('challenge.spot.kinds.thing');
  };
  const showList = screenReader || listMode;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.spot.title')}
        </Text>
        {!result ? (
          <Text variant="caption" tone="muted">
            {showList ? t('challenge.spot.listHelp') : t('challenge.spot.help')}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            {result.isCorrect ? t('challenge.spot.allFound') : t('challenge.spot.missedHint')}
          </Text>
        )}
      </View>

      <View style={[styles.counters, { gap: theme.spacing.sm }]}>
        <Badge
          label={t('challenge.spot.found', { found: found.length, total })}
          tone={allFound ? 'success' : 'primary'}
          icon="search"
        />
        <Badge
          label={t('challenge.spot.misses', { misses, max: maxMisses })}
          tone={misses >= maxMisses ? 'danger' : 'neutral'}
          icon="close"
        />
      </View>

      {pw > 0 ? (
        <View
          accessibilityElementsHidden={showList}
          importantForAccessibility={showList ? 'no-hide-descendants' : 'auto'}
          accessible={!showList}
          accessibilityLabel={t('challenge.spot.picturesLabel', { total })}
          style={styles.center}>
          <GestureDetector gesture={gesture}>
            <View
              style={[
                webNoSelect,
                stacked ? styles.column : styles.row,
                { gap, width: stacked ? pw : pw * 2 + gap },
              ]}>
              {renderPicture(0)}
              {renderPicture(1)}
            </View>
          </GestureDetector>
        </View>
      ) : null}

      {announce && !result ? (
        <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
          {announce}
        </Text>
      ) : null}

      {showList && !result ? (
        <View style={{ gap: theme.spacing.xs }}>
          {objects.map((o) => {
            const hit = changes.find((ch) => ch.object_id === o.id && found.includes(ch.id));
            const name = `${kindName(o.kind)}, ${t(`challenge.spot.colors.${o.color}`)}`;
            return (
              <View
                key={o.id}
                style={[
                  styles.listRow,
                  {
                    gap: theme.spacing.sm,
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm,
                    backgroundColor: hit ? c.successSoft : c.surfaceAlt,
                  },
                ]}>
                <Text style={styles.flex}>
                  {hit ? `${name} · ${t('challenge.spot.foundShort')}` : name}
                </Text>
                {!hit ? (
                  <Button
                    title={t('challenge.spot.isDifferent')}
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    disabled={locked || finished}
                    accessibilityLabel={t('challenge.spot.isDifferentLabel', { name })}
                    onPress={() => tapAt(objectCenterTap(o, aspect), 0)}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {!result && !screenReader ? (
        <View style={styles.center}>
          <Chip
            label={listMode ? t('challenge.spot.showPictures') : t('challenge.spot.showList')}
            icon={listMode ? 'image-outline' : 'list'}
            selected={listMode}
            onPress={() => setListMode((m) => !m)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thing: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  disc: { overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 3 },
  miss: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missText: { fontSize: 14, lineHeight: 17 },
  picture: { overflow: 'hidden' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  horizon: { position: 'absolute', left: 0, right: 0, height: 2 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  center: { alignItems: 'center' },
  counters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
