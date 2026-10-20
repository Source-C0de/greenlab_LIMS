#!/usr/bin/env node
/**
 * Layering guard — `npm run lint:layers`.
 *
 * Purpose: enforce one-way dependencies between the clean-architecture layers
 * once they land (see plan §"Target architecture"). Today the codebase is flat
 * (`src/{pages,components,lib,context,mock-data,hooks}`); this script is a
 * pure-bounded tool — it ONLY evaluates folders that already exist — so it is
 * safe to wire in NOW and let it gain teeth each phase as the new layers are
 * introduced.
 *
 * Layout rules (all paths are under `src/`, imports are relative to source file):
 *
 *   shared/         → external only
 *   domain/         → shared/
 *   application/    → shared/, domain/
 *   infrastructure/ → shared/, domain/            (MUST NOT import application/)
 *   presentation/   → shared/, application/, infrastructure/, domain/
 *
 * Every other top-level folder is treated as transitional. Once a phase moves
 * a file into the new tree, its rules engage automatically.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const LAYER_RULES = [
  { name: "shared",         allowFrom: [] },
  { name: "domain",         allowFrom: ["shared"] },
  { name: "application",    allowFrom: ["shared", "domain"] },
  { name: "infrastructure", allowFrom: ["shared", "domain"] },
  { name: "presentation",   allowFrom: ["shared", "domain", "application", "infrastructure"] },
];

/** @type {Array<{file: string, message: string}>} */
const violations = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/**
 * Walk one file's import statements. This is intentionally regex-based so we
 * don't need a TS parser — we only need to know "does this file depend on
 * $OTHER_LAYER?". Edge cases (dynamic imports inside conditionals) are
 * out of scope; the dominant signal comes from top-level imports.
 */
function importsIn(src) {
  const re = /^\s*(?:import\s+(?:type\s+)?[\s\S]*?from\s+|import\s*\()\s*['"]([^'"]+)['"]/gm;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

/** Resolve an import specifier (which may use the `@/` alias) to a path. */
function resolveImport(spec, file) {
  let resolved;
  if (spec.startsWith("@/")) resolved = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) resolved = resolve(dirname(file), spec);
  else return null; // bare-module or runtime URL — out of layer concern
  return resolved;
}

function layerOf(absPath) {
  for (const { name } of LAYER_RULES) {
    const top = join(SRC, name);
    // Use `relative` rather than startsWith(top + sep): on Windows the
    // separator is "\", so a hardcoded "/" would silently never match and the
    // guard would pass everything. relative() is separator-agnostic, and the
    // ".." check keeps sibling names like "src/domainatic" out.
    const rel = relative(top, absPath);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return name;
  }
  return null; // transitional / outside the layered tree
}

function check(file) {
  const layer = layerOf(file);
  if (!layer) return;
  const rule = LAYER_RULES.find((r) => r.name === layer);
  if (!rule) return;
  const allowed = new Set(rule.allowFrom);
  const src = readFileSync(file, "utf8");
  for (const spec of importsIn(src)) {
    const target = resolveImport(spec, file);
    if (!target) continue;
    const targetLayer = layerOf(target);
    if (!targetLayer) continue; // importing from transitional code — fine
    if (targetLayer === layer || allowed.has(targetLayer)) continue;
    violations.push({
      file: relative(ROOT, file),
      message: `${layer}/ must not depend on ${targetLayer}/ (${spec})`,
    });
  }
}

const files = walk(SRC);
for (const f of files) check(f);

if (violations.length === 0) {
  console.log("✔ Layering guard: 0 violations");
  process.exit(0);
}

console.error(`✖ Layering guard: ${violations.length} violation(s)`);
for (const v of violations) console.error(`  ${v.file}: ${v.message}`);
process.exit(1);
