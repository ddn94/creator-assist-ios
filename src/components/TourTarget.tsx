import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { PixelRatio, View, type StyleProp, type ViewStyle } from "react-native";

export type TourBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

type Entry = {
  measure: () => void;
  get: () => TourBox | null;
};

const registry = new Map<string, Entry>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Re-read spotlight boxes after a target lays out or moves. */
export function subscribeTourTargets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readTourTarget(name: string): TourBox | null {
  return registry.get(name)?.get() ?? null;
}

export function requestTourMeasure(name: string) {
  registry.get(name)?.measure();
}

/**
 * Marks a view the product tour can spotlight, the same job as the
 * website's data-tour attribute.
 */
type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

export function TourTarget({
  name,
  radius = 24,
  style,
  children,
}: {
  name: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const ref = useRef<Measurable | null>(null);
  const box = useRef<TourBox | null>(null);

  useEffect(() => {
    const entry: Entry = {
      measure: () => {
        ref.current?.measureInWindow((x, y, width, height) => {
          if (width < 8 || height < 8) {
            box.current = null;
          } else {
            const nextRadius = Math.min(radius, width / 2, height / 2);
            box.current = {
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(width),
              height: Math.round(height),
              radius: Math.round(nextRadius),
            };
          }
          notify();
        });
      },
      get: () => box.current,
    };
    registry.set(name, entry);
    entry.measure();
    return () => {
      if (registry.get(name) === entry) registry.delete(name);
      box.current = null;
      notify();
    };
  }, [name, radius]);

  return (
    <View
      ref={(node) => {
        ref.current = node as unknown as Measurable | null;
      }}
      collapsable={false}
      style={style}
      onLayout={() => registry.get(name)?.measure()}
    >
      {children}
    </View>
  );
}

/** Website Dimmer shade: rgba(32, 37, 43, 0.5). */
export const spotlightShade = "rgba(32, 37, 43, 0.5)";

type Span = { x: number; width: number };
type Band = { y: number; height: number; spans: Span[] };
type ShadeRow = { y: number; width: number; height: number };

const shadeRows = new Map<string, ShadeRow[]>();

/**
 * Rows that fill the part of a top-left corner square sitting outside a
 * circular arc. The website's SVG mask uses the same radius.
 */
function rowsForRadius(radius: number): ShadeRow[] {
  const scale = PixelRatio.get();
  const key = `${radius}@${scale}`;
  const cached = shadeRows.get(key);
  if (cached) return cached;
  const pixels = Math.max(1, Math.round(radius * scale));
  const rows: ShadeRow[] = [];
  for (let i = 0; i < pixels; i++) {
    const y = i / scale;
    const height = Math.min(1 / scale, radius - y);
    if (height <= 0) continue;
    const dy = (i + 0.5) / scale - radius;
    const remain = radius * radius - dy * dy;
    const edge = radius - (remain > 0 ? Math.sqrt(remain) : 0);
    if (edge <= 0) continue;
    rows.push({ y, width: Math.min(edge, radius), height });
  }
  shadeRows.set(key, rows);
  return rows;
}

function SpotlightCorner({
  x,
  y,
  radius,
  flipX = false,
  flipY = false,
}: {
  x: number;
  y: number;
  radius: number;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const rows = rowsForRadius(radius);
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, width: radius, height: radius }}
    >
      {rows.map((row, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: flipY ? radius - row.y - row.height : row.y,
            left: flipX ? radius - row.width : 0,
            width: row.width,
            height: row.height,
            backgroundColor: spotlightShade,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Paints the rounded corners the rectangular shade leaves open, so the hole
 * follows the view the way the website spotlight mask does.
 */
export function SpotlightCorners({ holes }: { holes: TourBox[] }) {
  return (
    <>
      {holes.map((hole) => {
        const radius = Math.min(hole.radius, hole.width / 2, hole.height / 2);
        if (radius < 1) return null;
        const right = hole.x + hole.width - radius;
        const bottom = hole.y + hole.height - radius;
        const key = `${hole.x}:${hole.y}:${hole.width}:${hole.height}:${radius}`;
        return (
          <Fragment key={key}>
            <SpotlightCorner x={hole.x} y={hole.y} radius={radius} />
            <SpotlightCorner x={right} y={hole.y} radius={radius} flipX />
            <SpotlightCorner x={hole.x} y={bottom} radius={radius} flipY />
            <SpotlightCorner x={right} y={bottom} radius={radius} flipX flipY />
          </Fragment>
        );
      })}
    </>
  );
}

function subtractSpan(span: Span, holeLeft: number, holeRight: number): Span[] {
  const spanRight = span.x + span.width;
  if (holeRight <= span.x || holeLeft >= spanRight) return [span];
  const pieces: Span[] = [];
  if (holeLeft > span.x) pieces.push({ x: span.x, width: holeLeft - span.x });
  if (holeRight < spanRight) pieces.push({ x: holeRight, width: spanRight - holeRight });
  return pieces;
}

/** Shade rectangles that cover the screen except the spotlight holes. */
export function spotlightBands(screenWidth: number, screenHeight: number, holes: TourBox[]): Band[] {
  let bands: Band[] = [{ y: 0, height: screenHeight, spans: [{ x: 0, width: screenWidth }] }];
  for (const hole of holes) {
    const holeBottom = hole.y + hole.height;
    const next: Band[] = [];
    for (const band of bands) {
      const bandBottom = band.y + band.height;
      const overlapTop = Math.max(band.y, hole.y);
      const overlapBottom = Math.min(bandBottom, holeBottom);
      if (overlapBottom <= overlapTop) {
        next.push(band);
        continue;
      }
      if (overlapTop > band.y) {
        next.push({ y: band.y, height: overlapTop - band.y, spans: band.spans });
      }
      const midSpans = band.spans.flatMap((span) => subtractSpan(span, hole.x, hole.x + hole.width));
      if (midSpans.length > 0) {
        next.push({ y: overlapTop, height: overlapBottom - overlapTop, spans: midSpans });
      }
      if (bandBottom > overlapBottom) {
        next.push({ y: overlapBottom, height: bandBottom - overlapBottom, spans: band.spans });
      }
    }
    bands = next;
  }
  return bands;
}
