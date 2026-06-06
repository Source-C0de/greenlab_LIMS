import { useMemo } from "react";

/**
 * BarcodeMock
 * -------------
 * Deterministic Code 128-style barcode renderer.
 * Generates a visually accurate 1D barcode (varying bar widths, quiet zone, value label)
 * purely from a string. NOT scannable by a real reader — this is a mock for previews/print.
 *
 * Pattern strategy:
 *  - Hash each character to a width 1-3
 *  - Add a Code 128-like start bar (110100) and stop bar (11000111010) in widths
 *  - Use width-1 spacer between every glyph
 */
export function BarcodeMock({
  value,
  height = 60,
  width = 220,
  showValue = true,
  className = "",
}: {
  value: string;
  height?: number;
  width?: number;
  showValue?: boolean;
  className?: string;
}) {
  const segments = useMemo(() => buildBarcodeSegments(value), [value]);

  const totalUnits = segments.reduce((sum, s) => sum + s.width, 0);
  const unitWidth = width / totalUnits;
  const barHeight = showValue ? height - 18 : height;

  return (
    <div
      className={`bg-white p-2 rounded-md border border-gray-200 inline-block ${className}`}
      style={{ width: width + 16, minHeight: height + 16 }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width={width} height={barHeight} fill="white" />
        {segments.map((seg, idx) => {
          const x = segments.slice(0, idx).reduce((sum, s) => sum + s.width * unitWidth, 0);
          const w = seg.width * unitWidth;
          if (seg.bar) {
            return (
              <rect
                key={idx}
                x={x}
                y={0}
                width={w}
                height={barHeight}
                fill="black"
              />
            );
          }
          return null;
        })}
        {showValue && (
          <text
            x={width / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize="10"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight="600"
            fill="black"
            style={{ letterSpacing: "0.5px" }}
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
}

type Segment = { bar: boolean; width: number };

function buildBarcodeSegments(value: string): Segment[] {
  // Quiet zone (left)
  const segments: Segment[] = [{ bar: false, width: 8 }];

  // Start guard (Code 128 start B: 11010010010 → widths 2,1,1,2,1,2)
  segments.push(
    { bar: true, width: 2 },
    { bar: false, width: 1 },
    { bar: true, width: 1 },
    { bar: false, width: 2 },
    { bar: true, width: 2 },
    { bar: false, width: 1 }
  );

  // Encode each character as 3 width-units of bar + 1 unit space.
  // Use char code to deterministically produce varying bar widths 1-3.
  for (const char of value) {
    const code = char.charCodeAt(0);
    const w1 = ((code * 7) % 3) + 1;
    const w2 = ((code * 13) % 3) + 1;
    const w3 = ((code * 19) % 3) + 1;
    segments.push({ bar: true, width: w1 });
    segments.push({ bar: false, width: 1 });
    segments.push({ bar: true, width: w2 });
    segments.push({ bar: false, width: 1 });
    segments.push({ bar: true, width: w3 });
    segments.push({ bar: false, width: 1 });
  }

  // Stop guard (Code 128 stop: 11000111010)
  segments.push(
    { bar: true, width: 2 },
    { bar: false, width: 1 },
    { bar: true, width: 3 },
    { bar: false, width: 1 },
    { bar: true, width: 2 }
  );

  // Quiet zone (right)
  segments.push({ bar: false, width: 8 });

  return segments;
}
