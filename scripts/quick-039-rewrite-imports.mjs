#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SCAN_DIR = path.join(ROOT, "packages/cli/src");
const EXTS = new Set([".ts", ".tsx"]);

const STRIP_EXTS = [".js", ".jsx", ".ts", ".tsx"];
const PACKAGE_PATH = /^sireno-deck-cli(\/|$)/;

const PREFIX_PATTERNS = [
	/\bfrom\s*$/,
	/=\s*require\s*\(\s*$/,
	/typeof\s+import\s*\(\s*$/,
	/await\s+import\s*\(\s*$/,
	/\bimport\s*\(\s*$/,
	/vi\.mock\s*\(\s*$/,
	/vi\.importActual\s*<[^>]*>\s*\(\s*$/,
	/vi\.importActualWithDefault\s*<[^>]*>\s*\(\s*$/,
	/importOriginal\s*<[^>]*>\s*\(\s*$/,
];

function firstLevel(absPath) {
	const rel = path.relative(SCAN_DIR, absPath);
	const segs = rel.split(path.sep);
	return segs[0] ?? "";
}

function addonName(absPath) {
	const fl = firstLevel(absPath);
	if (fl !== "builtin-addons") return null;
	const segs = path.relative(SCAN_DIR, absPath).split(path.sep);
	return segs[1] ?? null;
}

function sameBoundary(srcFile, target) {
	const srcFl = firstLevel(srcFile);
	const tgtFl = firstLevel(target);
	if (srcFl !== tgtFl) return false;
	if (srcFl === "builtin-addons") {
		return addonName(srcFile) === addonName(target);
	}
	return true;
}

function toPosix(p) {
	return p.split(path.sep).join("/");
}

function stripExt(spec) {
	for (const ext of STRIP_EXTS) {
		if (spec.endsWith(ext)) {
			return spec.slice(0, -ext.length);
		}
	}
	return spec;
}

function resolveRelative(srcFile, spec) {
	return path.resolve(path.dirname(srcFile), spec);
}

function aliasFor(target) {
	const rel = path.relative(SCAN_DIR, target);
	return `@/${toPosix(stripExt(rel))}`;
}

function classify(spec) {
	if (PACKAGE_PATH.test(spec)) return "package";
	if (!spec.startsWith(".") && !spec.startsWith("@/")) return "bare";
	if (!spec.startsWith(".")) return "alias";
	return "relative";
}

function rewriteSpec(srcFile, spec) {
	const cls = classify(spec);
	if (cls !== "relative") return { value: spec, action: "skip" };

	const target = resolveRelative(srcFile, spec);
	if (sameBoundary(srcFile, target)) {
		const stripped = stripExt(spec);
		if (stripped === spec) {
			return { value: spec, action: "skip" };
		}
		return { value: toPosix(stripped), action: "strip-ext" };
	}
	return { value: aliasFor(target), action: "rewrite-alias" };
}

function scanStrings(src) {
	const out = [];
	let i = 0;
	const n = src.length;
	let mode = "code";
	let stringStart = -1;
	let stringQuote = "";
	let templateDepth = 0;

	const flushString = (endIdx) => {
		out.push({
			idx: stringStart,
			quote: stringQuote,
			spec: src.slice(stringStart + 1, endIdx),
			end: endIdx + 1,
		});
		stringStart = -1;
		stringQuote = "";
	};

	while (i < n) {
		const c = src[i];
		const c2 = src[i + 1];

		if (mode === "code") {
			if (c === "/" && c2 === "/") {
				mode = "line-comment";
				i += 2;
				continue;
			}
			if (c === "/" && c2 === "*") {
				mode = "block-comment";
				i += 2;
				continue;
			}
			if (c === '"' || c === "'" || c === "`") {
				stringStart = i;
				stringQuote = c;
				if (c === "`") {
					mode = "template";
					templateDepth = 0;
				} else {
					mode = "string";
				}
				i++;
				continue;
			}
			i++;
			continue;
		}

		if (mode === "line-comment") {
			if (c === "\n") {
				mode = "code";
			}
			i++;
			continue;
		}

		if (mode === "block-comment") {
			if (c === "*" && c2 === "/") {
				mode = "code";
				i += 2;
				continue;
			}
			i++;
			continue;
		}

		if (mode === "string") {
			if (c === "\\") {
				i += 2;
				continue;
			}
			if (c === stringQuote) {
				flushString(i);
				mode = "code";
				i++;
				continue;
			}
			i++;
			continue;
		}

		if (mode === "template") {
			if (c === "\\") {
				i += 2;
				continue;
			}
			if (c === "`") {
				flushString(i);
				mode = "code";
				i++;
				continue;
			}
			if (c === "$" && c2 === "{") {
				templateDepth++;
				mode = "code";
				i += 2;
				continue;
			}
			i++;
			continue;
		}
	}

	return out;
}

function shouldRewrite(src, quoteIdx) {
	const before = src.slice(0, quoteIdx);
	for (const re of PREFIX_PATTERNS) {
		if (re.test(before)) return true;
	}
	return false;
}

async function* walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const e of entries) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			yield* walk(p);
		} else if (e.isFile() && EXTS.has(path.extname(e.name))) {
			yield p;
		}
	}
}

async function main() {
	const files = [];
	for await (const f of walk(SCAN_DIR)) files.push(f);

	let touched = 0;
	let stripExtTotal = 0;
	let aliasTotal = 0;
	let relativesKept = 0;
	const samples = [];

	for (const file of files) {
		const original = await readFile(file, "utf8");
		const strings = scanStrings(original);

		if (strings.length === 0) continue;

		const edits = [];
		for (const { idx, quote, spec } of strings) {
			if (quote === "`") continue;
			if (classify(spec) !== "relative") continue;
			if (!shouldRewrite(original, idx)) continue;

			const r = rewriteSpec(file, spec);
			if (r.action === "skip") {
				relativesKept++;
				continue;
			}
			if (r.action === "strip-ext") {
				stripExtTotal++;
				if (samples.length < 3) samples.push({ file, from: spec, to: r.value, kind: "strip" });
			} else if (r.action === "rewrite-alias") {
				aliasTotal++;
				if (samples.length < 3) samples.push({ file, from: spec, to: r.value, kind: "alias" });
			}
			edits.push({ idx, len: quote.length * 2 + spec.length, replacement: `${quote}${r.value}${quote}` });
		}

		if (edits.length === 0) continue;

		edits.sort((a, b) => b.idx - a.idx);
		let next = original;
		for (const e of edits) {
			next = next.slice(0, e.idx) + e.replacement + next.slice(e.idx + e.len);
		}
		await writeFile(file, next, "utf8");
		touched++;
	}

	console.log("Files touched:", touched);
	console.log(".js/.ts extensions stripped:", stripExtTotal);
	console.log("Rewrites to @/ alias:", aliasTotal);
	console.log("Relative imports kept:", relativesKept);
	console.log("Sample rewrites:");
	for (const s of samples) {
		console.log(`  [${s.kind}] ${path.relative(ROOT, s.file)}: "${s.from}" -> "${s.to}"`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
