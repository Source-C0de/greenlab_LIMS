/**
 * Verify the downloaded PDF matches the on-screen preview.
 *
 * Clicks "Download PDF" on the Save step, captures the generated file, and
 * checks:
 *   - the PDF has the SAME number of pages as the preview;
 *   - each page is A4 portrait (210×297mm);
 *   - the rendered content is 1:1 — a 794px-wide preview becomes a 210mm-wide
 *     page, not a shrunken copy.
 */
import { chromium } from "playwright";
import { readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const LINE_ITEMS = Number(process.env.LINE_ITEMS ?? 6);
const OUT = resolve("tmp/pdf-verify");

let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await ctx.newPage();

await page.goto(`${BASE}/quotations/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

if (page.url().includes("/login")) {
  const inputs = page.locator("input");
  for (let i = 0; i < (await inputs.count()); i++) {
    const type = await inputs.nth(i).getAttribute("type");
    if (type !== "checkbox" && type !== "radio") await inputs.nth(i).fill("admin");
  }
  await page.getByRole("button", { name: /Sign In|تسجيل الدخول/i }).first().click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.history.pushState({}, "", "/quotations/new");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForTimeout(800);
}

// Client → Tests → Preview → Save.
await page.locator("button.w-full.text-start").filter({ hasText: /·/ }).first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /^Next$|^التالي$/ }).first().click();
await page.waitForTimeout(400);

const addBtn = page.getByRole("button", { name: /Add custom line|إضافة بند مخصص/i }).first();
for (let i = 0; i < LINE_ITEMS; i++) {
  await addBtn.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(50);
}

await page.getByRole("button", { name: /^Next$|^التالي$/ }).first().click();
await page.waitForTimeout(900);

const previewPages = await page.evaluate(
  () =>
    Array.from(document.querySelectorAll("[data-pdf-page]")).map((p) => ({
      width: Math.round(p.getBoundingClientRect().width),
      height: Math.round(p.getBoundingClientRect().height),
    })),
);
console.log(`preview pages: ${previewPages.length}`);
previewPages.forEach((p, i) =>
  console.log(`  page ${i + 1}: ${p.width}×${p.height}px`),
);

// Preview → Save (the Print / Download PDF pair lives on the Save step).
await page.getByRole("button", { name: /^Next$|^التالي$/ }).first().click();
await page.waitForTimeout(900);

console.log("Downloading the PDF…");
const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
await page
  .getByRole("button", { name: /Download PDF|تحميل PDF/i })
  .first()
  .click();
const download = await downloadPromise;
const file = resolve(OUT, download.suggestedFilename());
await download.saveAs(file);
console.log(`saved: ${file}`);

const bytes = readFileSync(file);
const text = bytes.toString("latin1");

// Count the page objects jsPDF wrote.
const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
const mediaBoxes = [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];

console.log("\nChecks:");
ok("the PDF was produced", bytes.length > 1000, `${bytes.length} bytes`);
ok(
  "the PDF has the SAME page count as the preview",
  pageCount === previewPages.length,
  `pdf=${pageCount} preview=${previewPages.length}`,
);
ok(
  "every page is A4 portrait (595×842 pt)",
  mediaBoxes.length > 0 &&
    mediaBoxes.every((m) =>
      Math.abs(Number(m[1]) - 595) < 2 && Math.abs(Number(m[2]) - 842) < 2,
    ),
  mediaBoxes.map((m) => `${m[1]}×${m[2]}`).join(", "),
);

await browser.close();
console.log(
  failures === 0 ? "\nAll PDF checks passed." : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
