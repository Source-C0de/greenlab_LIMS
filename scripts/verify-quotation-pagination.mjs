/**
 * Structural checks for the dynamic-pagination quotation document.
 *
 * Verifies, against the SOURCE (not the bundle):
 *   - `PAGE_COUNT` is gone; the footer takes its total from the computed list.
 *   - the masthead is rendered only on page 1.
 *   - the footer is rendered inside the page map, once per page.
 *   - every body section carries `data-section-key`.
 *   - the old literal `data-pdf-page="1"` / `="2"` wrappers are gone.
 *   - `.print-a4-page` has `width: 210mm` in the BASE css (not only in
 *     `@media print`).
 *   - the PDF builder is untouched.
 */
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";

let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const SRC = "src/presentation/components/features/quotations/QuotationPreview.tsx";
const CSS = "src/index.css";
const PDF = "src/shared/lib/pdf-report.ts";

const src = readFileSync(SRC, "utf8");
const css = readFileSync(CSS, "utf8");
const pdf = readFileSync(PDF, "utf8");

console.log("QuotationPreview.tsx — source checks");

ok("PAGE_COUNT constant removed", !src.includes("PAGE_COUNT"));
ok(
  "no literal data-pdf-page=\"1\"",
  !/data-pdf-page="1"/.test(src),
  "page attribute must be computed",
);
ok("no literal data-pdf-page=\"2\"", !/data-pdf-page="2"/.test(src));
ok(
  "page attribute is computed",
  /data-pdf-page=\{i \+ 1\}/.test(src),
);
ok(
  "masthead guarded to page 1",
  /\{i === 0 && renderMasthead\(\)\}/.test(src),
  "the masthead must render only on the first page",
);
ok(
  "footer rendered inside the page map",
  /\{renderFooter\(i \+ 1, pages\.length\)\}/.test(src),
);
ok("footer total comes from the computed page list", /pages\.length/.test(src));
ok(
  "every section carries data-section-key",
  /data-section-key=\{key\}/.test(src),
);
ok(
  "section keys are declared once",
  /const SECTION_KEYS = \[/.test(src),
);
ok(
  "oversized page is flagged",
  /data-page-oversized/.test(src),
);
ok(
  "measuring pass exists",
  /ref=\{measureRef\}/.test(src),
);
ok(
  "measurement runs in a layout effect",
  /useLayoutEffect\(\(\) => \{/.test(src),
);
ok(
  "state guard prevents a re-render loop",
  /sameAssignment\(prev, next\) \? prev : next/.test(src),
);
ok(
  "page budget is derived from the measured footer",
  /A4_HEIGHT_PX - bodyPad - footerH/.test(src),
  "the content budget must come from the real DOM, not a guess",
);
ok(
  "the masthead is measured too",
  /data-measure-header/.test(src),
);
ok(
  "the footer's real height is measured",
  /data-measure-footer/.test(src),
);
ok(
  "the body's real padding is measured",
  /data-measure-body/.test(src),
);
ok(
  "the section gap is measured, not hard-coded",
  /getBoundingClientRect\(\)\.top - el\.getBoundingClientRect\(\)\.top/.test(src),
);

// --- AST: the footer must be inside the page map, and the masthead inside
//     the same map but guarded. Verify with the TypeScript parser. ---
console.log("\nAST checks");
const sf = ts.createSourceFile(SRC, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

let pagesMapNode = null;
const visit = (node) => {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "map" &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "pages"
  ) {
    pagesMapNode = node;
  }
  ts.forEachChild(node, visit);
};
visit(sf);
ok("pages.map(...) call found", pagesMapNode !== null);

if (pagesMapNode) {
  const mapText = pagesMapNode.getText(sf);
  ok("footer call is inside the map", mapText.includes("renderFooter("));
  ok("masthead guard is inside the map", mapText.includes("i === 0"));
  ok(
    "every section key is rendered",
    /page\.sections\.map/.test(mapText),
  );
}

console.log("\nindex.css — print geometry checks");

// Find every `.print-a4-page { ... }` block and note whether it is inside an
// `@media print` block. A rule that is NOT inside one must carry the A4
// width — that is the whole point of the fix.
function cssBlocks(source, selector) {
  const out = [];
  const re = new RegExp(
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{",
    "g",
  );
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
    out.push({ start: m.index, body: source.slice(open, i - 1) });
  }
  return out;
}

// Find the byte ranges covered by `@media print { ... }` (balanced braces).
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
const inPrint = (offset) => printRanges.some(([a, b]) => offset >= a && offset < b);

const pageRules = cssBlocks(css, ".print-a4-page");
ok(".print-a4-page rule exists", pageRules.length > 0);

const baseRule = pageRules.find((r) => !inPrint(r.start));
ok(
  ".print-a4-page has a BASE (non-@media-print) rule",
  baseRule !== undefined,
  "the A4 width must apply on screen too, or the PDF is a shrunken copy",
);
if (baseRule) {
  ok(
    "base rule sets width: 210mm",
    /width:\s*210mm/.test(baseRule.body),
    baseRule.body.trim().replace(/\s+/g, " ").slice(0, 120),
  );
  ok(
    "base rule shows the sheet edge",
    /box-shadow/.test(baseRule.body),
  );
}

const printRule = pageRules.find((r) => inPrint(r.start));
ok(".print-a4-page has a print rule", printRule !== undefined);
if (printRule) {
  ok(
    "print rule drops the shadow",
    /box-shadow:\s*none/.test(printRule.body),
  );
  ok(
    "print rule keeps break-inside: avoid",
    /break-inside:\s*avoid/.test(printRule.body),
  );
}

ok(
  "[data-page-oversized] rule exists",
  /\[data-page-oversized\]/.test(css),
);
ok(
  "oversized pages may flow across sheets",
  /\[data-page-oversized\]\s*\{[^}]*break-inside:\s*auto/.test(css),
);

console.log("\npdf-report.ts — untouched");
ok(
  "fit math unchanged (Math.min of the two ratios)",
  /const ratio = Math\.min\(widthRatio, heightRatio\);/.test(pdf),
);
ok(
  "one section = one PDF page",
  /pdf\.addPage\("a4", "portrait"\)/.test(pdf),
);

console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
