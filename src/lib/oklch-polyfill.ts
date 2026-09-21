/**
 * Tailwind v4 generates `oklch()` color values in its compiled CSS. The
 * bundled `html2canvas@1.4.1` library does NOT understand `oklch()` and
 * throws `Attempting to parse an unsupported color function "oklch"`. This
 * silently kills PDF generation.
 *
 * This module walks a DOM subtree and, for every element, rewrites the inline
 * `style.color`, `style.backgroundColor`, `style.borderColor`, etc. with the
 * COMPUTED rgb equivalent of whatever Tailwind wrote. Once the values are
 * rgb(), html2canvas can parse them.
 *
 * Why this works:
 *   - `getComputedStyle(el).color` always resolves to a `rgb(...)` /
 *     `rgba(...)` string, even if the underlying stylesheet uses `oklch()`.
 *   - We then write that resolved value back to `el.style.color`, which
 *     makes it the inline (highest-specificity) value and the one html2canvas
 *     will use.
 *
 * Caveats:
 *   - We only rewrite the color-bearing properties html2canvas cares about
 *     (color, background, border, outline, fill, stroke, box-shadow, text-shadow).
 *     Other properties are left alone.
 *   - The polyfill is idempotent — running it twice is safe.
 */

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "fill",
  "stroke",
  "caret-color",
  "text-decoration-color",
  "column-rule-color",
  "accent-color",
] as const;

const SHADOW_PROPS = [
  "box-shadow",
  "text-shadow",
] as const;

/**
 * Match any modern CSS color function html2canvas@1.4.1 doesn't understand:
 *   - `oklch()` (Tailwind v4 default)
 *   - `oklab()` (Tailwind v4 secondary)
 *   - `color()` with named color spaces
 *   - `lab()`, `lch()`, `hsl()` (with modern syntax Tailwind uses)
 *
 * The probe below resolves ALL of these — the browser's `getComputedStyle()`
 * always returns rgb()/rgba() as the canonical form for any parseable color.
 */
function hasUnsupportedColorFunction(value: string): boolean {
  return /\b(?:oklch|oklab|lab|lch|color|hsl|hwb)\s*\(/i.test(value);
}

/**
 * Resolve `oklch()` in a single property by reading the computed style (which
 * always returns rgb/rgba) and writing it back to the inline style. If the
 * computed value still contains `oklch()` (very rare — only if the browser
 * itself doesn't support it), fall back to a neutral default.
 */
function rewriteProp(
  el: HTMLElement,
  prop: (typeof COLOR_PROPS)[number] | (typeof SHADOW_PROPS)[number],
  isShadow: boolean,
): void {
  const computed = window.getComputedStyle(el);
  // For shadow props, read the property; for colors, use getPropertyValue with
  // the standard naming so we get the resolved color out of any shorthand.
  const value = computed.getPropertyValue(prop);
  if (!value || value === "none" || value === "initial") return;
  if (!hasUnsupportedColorFunction(value)) return;

  // Resolve via a temporary element — this forces the browser to give us the
  // final rgb value for any color-bearing string (incl. shadow stacks).
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (probe.style as any)[prop] = value;
  document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).getPropertyValue(prop);
  document.body.removeChild(probe);

  if (!resolved || hasUnsupportedColorFunction(resolved)) {
    // Couldn't resolve. For shadows, drop to "none" to avoid the parser error.
    // For colors, fall back to a neutral that always parses.
    if (isShadow) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el.style as any)[prop] = "none";
    } else if (prop === "color") {
      el.style.color = "#000000";
    } else if (prop.startsWith("background")) {
      el.style.backgroundColor = "transparent";
    } else if (prop.startsWith("border")) {
      el.style.borderColor = "currentColor";
    }
    return;
  }

  // Write the resolved value back to the inline style. This shadows whatever
  // the stylesheet says with a same-meaning rgb value html2canvas understands.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (el.style as any)[prop] = resolved;
}

/**
 * Walk a DOM subtree and rewrite every element's color-bearing properties so
 * that no computed style returns an `oklch()` string. html2canvas can then
 * parse every color without throwing.
 *
 * Idempotent — safe to call multiple times on the same subtree.
 */
export function stripOklchFromSubtree(root: HTMLElement): void {
  const all = [root, ...root.querySelectorAll<HTMLElement>("*")];
  for (const el of all) {
    for (const prop of COLOR_PROPS) {
      rewriteProp(el, prop, false);
    }
    for (const prop of SHADOW_PROPS) {
      rewriteProp(el, prop, true);
    }
  }
}
