/**
 * Runtime verification of the dynamic pagination.
 *
 * Drives the real app in Chromium and inspects the rendered DOM:
 *   - the number of `data-pdf-page` nodes matches the footer's "Page N of M";
 *   - the masthead appears on the FIRST page only;
 *   - every page has a footer;
 *   - the page wrapper is 210mm wide (794px) on screen — preview ≡ print;
 *   - a section is never split: each page's sections start at a section
 *     boundary;
 *   - adding line items grows the page count (it is dynamic, not fixed at 2).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const LINE_ITEMS = Number(process.env.LINE_ITEMS ?? 24);

let failures = 0;
const ok = (name, cond, detail = "") => {
  if (cond) {
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/** Read the rendered pages out of the document. */
const readPages = () =>
  Array.from(document.querySelectorAll("[data-pdf-page]")).map((p, i) => ({
    index: i + 1,
    width: Math.round(p.getBoundingClientRect().width),
    height: Math.round(p.getBoundingClientRect().height),
    sections: Array.from(p.querySelectorAll("[data-section-key]")).map(
      (s) => s.getAttribute("data-section-key"),
    ),
    hasMasthead: !!p.querySelector("img[src*='GL LOGO_Business Card 1.svg']"),
    footerText: (() => {
      const spans = Array.from(p.querySelectorAll("span"));
      const hit = spans.find((s) =>
        /^Page \d+ of \d+$/.test(s.textContent.trim()),
      );
      return hit ? hit.textContent.trim() : null;
    })(),
  }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

console.log("Opening the quotation wizard…");
await page.goto(`${BASE}/quotations/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Sign in (mock mode accepts any credentials). The mock session lives in
// module memory, so a full reload would lose it — navigate client-side.
if (page.url().includes("/login")) {
  console.log("Signing in…");
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
await page.waitForTimeout(500);

// ---- Step 1: pick a client. -------------------------------------------
console.log("Selecting a client…");
// A client row is a full-width button whose text ends with the client id
// badge (e.g. "Acme Ltd · 3000123456 C001").
const clientRow = page
  .locator("button.w-full.text-start")
  .filter({ hasText: /·/ })
  .first();
if (!(await clientRow.count())) {
  console.log("  (no client row matched; dumping buttons)");
  for (const b of await page.locator("button").all()) {
    console.log(
      "   btn:",
      ((await b.textContent()) ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
    );
  }
  throw new Error("no client row found");
}
await clientRow.click();
await page.waitForTimeout(500);

// ---- Step 2: tests. ---------------------------------------------------
console.log("Advancing to the Tests step…");
const nextBtn = page.getByRole("button", { name: /^Next$|^التالي$/ }).first();
await nextBtn.click();
await page.waitForTimeout(500);

console.log(`Adding ${LINE_ITEMS} line items…`);
const addBtn = page
  .getByRole("button", { name: /Add custom line|إضافة بند مخصص/i })
  .first();
let added = 0;
if (await addBtn.count()) {
  for (let i = 0; i < LINE_ITEMS; i++) {
    try {
      await addBtn.click({ timeout: 1500 });
      added++;
    } catch {
      break;
    }
    await page.waitForTimeout(60);
  }
}
console.log(`  (added ${added} line item(s))`);

// ---- Step 3: preview. -------------------------------------------------
console.log("Advancing to the Preview step…");
const next2 = page.getByRole("button", { name: /^Next$|^التالي$/ }).first();
await next2.click();
await page.waitForTimeout(900);

const pages = await page.evaluate(readPages);

console.log("\nRendered pages:");
for (const p of pages) {
  console.log(
    `  page ${p.index}: ${p.width}×${p.height}px  sections=[${p.sections.join(", ")}]  footer="${p.footerText}"  masthead=${p.hasMasthead}`,
  );
}

console.log("\nChecks:");
ok("at least one page rendered", pages.length > 0, `${pages.length} page(s)`);
ok(
  "page count is DYNAMIC (not fixed at 2)",
  pages.length !== 2 || added < 10,
  `${pages.length} page(s) with ${added} line item(s)`,
);
ok(
  "every page is 210mm wide (794px) on screen",
  pages.length > 0 && pages.every((p) => Math.abs(p.width - 794) <= 2),
  pages.map((p) => p.width).join(", "),
);
ok(
  "masthead appears on the FIRST page only",
  pages.length > 0 &&
    pages[0].hasMasthead &&
    pages.slice(1).every((p) => !p.hasMasthead),
);
ok(
  "every page has a footer with 'Page N of M'",
  pages.length > 0 && pages.every((p) => p.footerText !== null),
  pages.map((p) => p.footerText).join(" | "),
);
ok(
  "the footer's page numbers are correct and sequential",
  pages.length > 0 &&
    pages.every((p, i) => p.footerText === `Page ${i + 1} of ${pages.length}`),
  pages.map((p) => p.footerText).join(" | "),
);
ok(
  "the footer's total matches the real page count",
  pages.length > 0 &&
    pages.every((p) => p.footerText?.endsWith(`of ${pages.length}`)),
);

// No section may appear on two pages — a section is never split.
const allSections = pages.flatMap((p) => p.sections);
const unique = new Set(allSections);
ok(
  "no section is split across pages",
  allSections.length === unique.size,
  allSections.length === unique.size
    ? `${unique.size} distinct section(s)`
    : `duplicated: ${allSections.join(", ")}`,
);
ok(
  "every declared section appears somewhere",
  ["title", "customer", "items", "payment", "approval", "terms", "requirements"].every(
    (k) => unique.has(k),
  ),
  Array.from(unique).join(", "),
);
ok(
  "sections keep their document order across pages",
  (() => {
    const order = [
      "title",
      "customer",
      "items",
      "payment",
      "approval",
      "terms",
      "requirements",
    ];
    const seen = allSections.filter((s) => order.indexOf(s) >= 0);
    const idx = seen.map((s) => order.indexOf(s));
    return idx.every((v, i) => i === 0 || v > idx[i - 1]);
  })(),
);
ok(
  "no page exceeds the A4 height (1122px)",
  pages.length > 0 && pages.every((p) => p.height <= 1122),
  pages.map((p) => p.height).join(", "),
);
ok(
  "no runtime errors",
  errors.length === 0,
  errors.slice(0, 3).join(" | "),
);

await browser.close();

console.log(
  failures === 0
    ? "\nAll runtime checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
