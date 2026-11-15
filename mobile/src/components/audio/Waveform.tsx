import { useMemo, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

export interface WaveformProps {
  /** Peaks 0–100; null when unknown (renders a plain progress line instead of inventing a shape). */
  peaks: number[] | null;
  /** 0–1 */
  progress: number;
  height?: number;
  active?: boolean;
  onSeek?: (fraction: number) => void;
  barWidth?: number;
  gap?: number;
  playedColor?: string;
  idleColor?: string;
  accessibilityLabel?: string;
}

function resample(peaks: number[], count: number): number[] {
  if (count <= 0) return [];
  if (peaks.length === count) return peaks;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * peaks.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * peaks.length) / count));
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, peaks[j] ?? 0);
    out.push(max);
  }
  return out;
}

/** Thin rounded bars: played in Paper, unplayed in Fader, playhead in Signal. Tap or drag to seek. */
export function Waveform({
  peaks,
  progress,
  height = 40,
  active = false,
  onSeek,
  barWidth = 3,
  gap = 2,
  playedColor = colors.paper,
  idleColor = colors.fader,
  accessibilityLabel,
}: WaveformProps) {
  const [width, setWidth] = useState(0);
  const count = Math.max(0, Math.floor((width + gap) / (barWidth + gap)));
  const bars = useMemo(() => (peaks ? resample(peaks, count) : []), [peaks, count]);
  const p = Math.max(0, Math.min(1, progress));
  const headX = p * width;

  const seekFrom = (e: GestureResponderEvent) => {
    if (!onSeek || width <= 0) return;
    onSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / width)));
  };

  return (
    <View
      style={{ height }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole={onSeek ? 'adjustable' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      accessibilityActions={onSeek ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={(e) => {
        if (!onSeek) return;
        onSeek(Math.max(0, Math.min(1, p + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))));
      }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {peaks ? (
            bars.map((v, i) => {
              const h = Math.max(2, (v / 100) * height);
              const x = i * (barWidth + gap);
              const played = active && x + barWidth / 2 <= headX;
              return (
                <Rect
                  key={i}
                  x={x}
                  y={(height - h) / 2}
                  width={barWidth}
                  height={h}
                  rx={barWidth / 2}
                  fill={played ? playedColor : idleColor}
                />
              );
            })
          ) : (
            <>
              <Rect x={0} y={height / 2 - 1} width={width} height={2} rx={1} fill={idleColor} />
              {active ? <Rect x={0} y={height / 2 - 1} width={headX} height={2} rx={1} fill={playedColor} /> : null}
            </>
          )}
          {active ? <Circle cx={Math.max(4, Math.min(width - 4, headX))} cy={height / 2} r={4} fill={colors.signal} /> : null}
        </Svg>
      ) : null}
      {onSeek ? (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={seekFrom}
          onResponderMove={seekFrom}
          onResponderTerminationRequest={() => false}
        />
      ) : null}
    </View>
  );
}
