import { memo } from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * One-colour Brainy Clan owl mark (Ollie's silhouette from `assets/brand/owl.svg`, simplified):
 * body and ear tufts in `color`, eyes and beak cut out in `background`. Colours come from the
 * caller's theme tokens.
 */
export const OwlMark = memo(function OwlMark({
  size,
  color,
  background,
}: {
  size: number;
  color: string;
  background: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M29.3 38 L28.5 20.1 L42.8 28.5 Z M70.7 38 L71.5 20.1 L57.2 28.5 Z"
        fill={color}
        stroke={color}
        strokeWidth={4.3}
        strokeLinejoin="round"
      />
      <Ellipse cx={50} cy={53.3} rx={26.2} ry={28.9} fill={color} />
      <Circle cx={40.8} cy={44.1} r={9.2} fill={background} />
      <Circle cx={59.2} cy={44.1} r={9.2} fill={background} />
      <Circle cx={42.4} cy={45.3} r={4.9} fill={color} />
      <Circle cx={57.6} cy={45.3} r={4.9} fill={color} />
      <Path d="M47.5 53.5 L52.5 53.5 L50 58 Z" fill={background} />
      <Path
        d="M43.8 63.5 q2.1 2.3 4.3 0 M52 63.5 q2.1 2.3 4.3 0 M47.9 69.5 q2.1 2.3 4.3 0"
        fill="none"
        stroke={background}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
});
