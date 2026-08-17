/**
 * Fails the build if an opcode-routed endpoint path reaches the client bundle.
 *
 * ─── What this protects ─────────────────────────────────────────────────────
 * Opcode-routed calls go out as POST /api/<24-hex> with a two-letter opcode in
 * the body. The point is that the real endpoint name never reaches the browser:
 * `lib/opcodeMap.ts` holds the opcode→path table, but only the server branch
 * uses it, so bundlers drop it from the client build.
 *
 * That property is invisible. Nothing fails when it breaks. It broke once
 * already: every endpoint definition was written as
 *
 *     request({ path: '/auth/reset-passcode/init', op: 'ri', ... })
 *
 * with `path` present purely as documentation — ignored at runtime, but a
 * string literal in a client module, so it shipped. The bundle carried the
 * whole opcode→endpoint table. The build was green throughout.
 *
 * `request()`'s PathSpec | OpSpec union now makes that exact mistake a type
 * error, but a type can only forbid the shapes it knows about. A hardcoded
 * fetch, a logged URL, an analytics label or a comment that survives
 * minification would all leak the same names past the compiler. This checks the
 * artefact that actually ships.
 *
 * ─── How ────────────────────────────────────────────────────────────────────
 * Paths are read from lib/opcodeMap.ts rather than duplicated here, so adding
 * an opcode extends the check automatically. Each is searched for without its
 * /api prefix, which matches both the prefixed and unprefixed spellings.
 *
 * Usage:  node ./scripts/check-bundle-opacity.mjs [buildDir]
 * Exits 0 if clean, 1 if a path leaked or the inputs cannot be read.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.argv[3] ?? '.');
const STATIC_DIR = resolve(ROOT, process.argv[2] ?? '.next/static');
const OPCODE_MAP = resolve(ROOT, 'src/lib/opcodeMap.ts');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/**
 * Resolve NEXT_PUBLIC_OPAQUE_API the way the app does: an explicit env var
 * wins, otherwise the .env files, defaulting to on.
 *
 * With opacity off the client is *supposed* to call descriptive paths, so the
 * check would be reporting the intended behaviour as a failure.
 */
function opaqueEnabled() {
    if (process.env.NEXT_PUBLIC_OPAQUE_API !== undefined) {
        return process.env.NEXT_PUBLIC_OPAQUE_API !== 'false';
    }
    // Next's precedence for a production build: .env.production.local,
    // .env.local, .env.production, .env — first hit wins.
    for (const name of ['.env.production.local', '.env.local', '.env.production', '.env']) {
        const file = resolve(ROOT, name);
        if (!existsSync(file)) continue;
        const m = readFileSync(file, 'utf8').match(/^\s*NEXT_PUBLIC_OPAQUE_API\s*=\s*(\S+)/m);
        if (m) return m[1].replace(/['"]/g, '') !== 'false';
    }
    return true;
}

/**
 * Pull every path literal out of the opcode tables.
 *
 * Two shapes appear: `path: () => '/api/...'` and, for the one parameterised
 * op, `path: (d) => \`/api/...${...}\``. The template's static prefix is enough
 * to identify a leak.
 */
function opcodePaths(source) {
    const paths = new Set();
    const re = /path:\s*\([^)]*\)\s*=>\s*(?:'([^']+)'|`([^`$]+))/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        const raw = (m[1] ?? m[2]).trim();
        // Reduce to the bare route stem:
        //  - drop any query string, or the needle would only match a leak that
        //    happened to carry the same params ('transfer-purpose?type=ALL'
        //    would sail past a bundled '/transfer-purpose');
        //  - drop /api so both the prefixed and unprefixed spellings match;
        //  - drop a trailing slash left where a path parameter was interpolated.
        const needle = raw
            .split('?')[0]
            .replace(/^\/api\//, '')
            .replace(/\/+$/, '');
        if (needle) paths.add(needle);
    }
    return [...paths];
}

function jsFiles(dir) {
    const out = [];
    const walk = (d) => {
        for (const entry of readdirSync(d)) {
            const full = join(d, entry);
            if (statSync(full).isDirectory()) walk(full);
            else if (entry.endsWith('.js')) out.push(full);
        }
    };
    walk(dir);
    return out;
}

// ── run ─────────────────────────────────────────────────────────────────────

if (!opaqueEnabled()) {
    console.log(dim('[bundle-opacity] NEXT_PUBLIC_OPAQUE_API=false — skipped.'));
    process.exit(0);
}

if (!existsSync(OPCODE_MAP)) {
    console.error(red(`[bundle-opacity] cannot read ${relative(ROOT, OPCODE_MAP)}`));
    process.exit(1);
}

if (!existsSync(STATIC_DIR)) {
    console.error(
        red(`[bundle-opacity] no client build at ${relative(ROOT, STATIC_DIR)} — run the build first.`),
    );
    process.exit(1);
}

const mapSource = readFileSync(OPCODE_MAP, 'utf8');
const needles = opcodePaths(mapSource);
if (needles.length === 0) {
    // An empty list would pass silently and prove nothing — that is a broken
    // check, not a clean bundle.
    console.error(red('[bundle-opacity] parsed 0 paths from opcodeMap.ts — the check is broken.'));
    process.exit(1);
}

/**
 * Every declared opcode must have yielded a needle.
 *
 * Scraping source with a regex fails quietly: anything between `=>` and the
 * quote — a comment, an unusual line break — hides that route, and the check
 * then reports success while never having looked for it. That happened: a
 * comment above the `tl` template dropped /transfers/lookup-account from the
 * scan silently. Comparing counts turns a blind spot into a failure.
 */
const declaredOps = (mapSource.match(/^\s{4}[a-z]{2}: [{(]/gm) ?? []).length;
if (needles.length < declaredOps) {
    console.error(
        red(
            `[bundle-opacity] parsed ${needles.length} path(s) but opcodeMap declares ${declaredOps} opcode(s).`,
        ),
    );
    console.error(
        'Some route was not scraped, so it is not being checked. Keep the path\n' +
            'literal directly after `=>` with nothing in between.\n',
    );
    process.exit(1);
}

const files = jsFiles(STATIC_DIR);
if (files.length === 0) {
    console.error(red(`[bundle-opacity] no .js under ${relative(ROOT, STATIC_DIR)} — nothing scanned.`));
    process.exit(1);
}

const leaks = [];
for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const needle of needles) {
        const at = text.indexOf(needle);
        if (at === -1) continue;
        leaks.push({
            needle,
            file: relative(ROOT, file),
            excerpt: text.slice(Math.max(0, at - 60), at + needle.length + 40).replace(/\s+/g, ' '),
        });
    }
}

if (leaks.length > 0) {
    console.error(red(`\n[bundle-opacity] ${leaks.length} opcode-routed path(s) reached the client bundle:\n`));
    for (const { needle, file, excerpt } of leaks) {
        console.error(`  ${red(needle)}`);
        console.error(`    ${dim(file)}`);
        console.error(`    ${dim('…' + excerpt + '…')}\n`);
    }
    console.error(
        'These endpoints are reached by opcode, so their names must not ship.\n' +
            'Usually a `path` declared next to an `op`, or a hardcoded fetch that\n' +
            'should go through @/api. Remove the literal, rebuild, re-run.\n',
    );
    process.exit(1);
}

console.log(
    green(`[bundle-opacity] ok`) +
        dim(` — ${needles.length} opcode path(s) absent from ${files.length} client chunk(s).`),
);
