/**
 * Check the COMPILED bundle CSS: `.print-a4-page` must have a rule OUTSIDE
 * `@media print` that sets the A4 width, and one INSIDE that drops the
 * shadow. Tailwind could silently drop the base rule if it were nested
 * wrongly, so this verifies the shipped artifact, not the source.
 */
import { readFileSync, readdirSync } from "node:fs";

const dir = "dist/assets";
const file = readdirSync(dir).find((f) => f.endsWith(".css"));
const css = readFileSync(`${dir}/${file}`, "utf8");
console.log(`bundle: ${dir}/${file} (${css.length} bytes)\n`);

function mediaPrintRanges(source) {
  const ranges = [];
  const re = /@media[^{]*print[^{]*\{/g;
  let m;
  while ((m = re.exec(source))) {
    const open = m.index + m[0].length;
    let depth = 1;
    let i = open;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    ranges.push([m.index, i]);
  }
  return ranges;
}

const printRanges = mediaPrintRanges(css);
const inPrint = (off) => printRanges.some(([a, b]) => off >= a && off < b);

const re = /\.print-a4-page\s*\{/g;
let m;
let n = 0;
let baseFound = false;
let printFound = false;

while ((m = re.exec(css))) {
  n++;
  const open = m.index + m[0].length;
  let depth = 1;
  let i = open;
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
    i++;
  }
  const body = css.slice(open, i - 1);
  const where = inPrint(m.index) ? "INSIDE @media print" : "BASE (screen too)";
  console.log(`rule #${n} @${m.index} — ${where}`);
  console.log(`   ${body.trim().replace(/\s+/g, " ")}\n`);

  if (!inPrint(m.index) && /width:\s*210mm/.test(body)) baseFound = true;
  if (inPrint(m.index) && /box-shadow:\s*none/.test(body)) printFound = true;
}

console.log(`BASE rule with width:210mm ......... ${baseFound ? "PASS" : "FAIL"}`);
console.log(`PRINT rule with box-shadow:none .... ${printFound ? "PASS" : "FAIL"}`);
console.log(`[data-page-oversized] present ...... ${/\[data-page-oversized\]/.test(css) ? "PASS" : "FAIL"}`);

process.exit(baseFound && printFound ? 0 : 1);
