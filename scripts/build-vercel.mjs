/**
 * Post-build script: converts TanStack Start's dist/ output into
 * Vercel Build Output API v3 format (.vercel/output/).
 *
 * TanStack Start builds:
 *   dist/client/  — static assets
 *   dist/server/server.js — fetch-based SSR handler
 *
 * We bundle the server into a self-contained Vercel Node.js function
 * and copy static assets to .vercel/output/static/.
 */
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const outputDir = resolve(root, ".vercel/output");

// ── 1. Clean previous output ─────────────────────────────────────────────────
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

// ── 2. Vercel output config ───────────────────────────────────────────────────
writeFileSync(
  resolve(outputDir, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      // Cache immutable hashed assets forever
      {
        src: "^/assets/(.+)",
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      // Let Vercel serve real static files first; fall through to SSR for rest
      { handle: "filesystem" },
      // All remaining requests → SSR function
      { src: "/(.*)", dest: "/ssr" },
    ],
  }),
);

// ── 3. Static assets ─────────────────────────────────────────────────────────
const staticOut = resolve(outputDir, "static");
mkdirSync(staticOut, { recursive: true });
cpSync(resolve(root, "dist/client"), staticOut, { recursive: true });
console.log("✓ static assets copied to .vercel/output/static/");

// ── 4. SSR function ───────────────────────────────────────────────────────────
const funcDir = resolve(outputDir, "functions/ssr.func");
mkdirSync(funcDir, { recursive: true });

// .vc-config.json — tells Vercel this is a Node.js function
writeFileSync(
  resolve(funcDir, ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
  }),
);

// Write a thin entry point that wraps the TanStack Start fetch handler
// using srvx's Node.js adapter (same pattern as nitro's vercel preset).
const serverPath = resolve(root, "dist/server/server.js");
const srvxNodePath = resolve(root, "node_modules/srvx/dist/adapters/node.mjs");

const entrySource = `
import { toNodeHandler } from ${JSON.stringify(srvxNodePath)};
import server from ${JSON.stringify(serverPath)};

const handler = toNodeHandler(server.fetch.bind(server));

export default function vercelHandler(req, res) {
  // Forward real client IP from Vercel's proxy header
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    Object.defineProperty(req.socket, "remoteAddress", {
      get: () => forwarded.split(",")[0].trim(),
      configurable: true,
    });
  }
  return handler(req, res);
}
`;
writeFileSync(resolve(funcDir, "entry.mjs"), entrySource);

// Bundle: entry + server.js + all deps → single self-contained index.mjs
await build({
  entryPoints: [resolve(funcDir, "entry.mjs")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: resolve(funcDir, "index.mjs"),
  packages: "bundle",
  external: [
    // Node.js built-ins (both prefixed and bare names)
    "node:*",
    "assert", "async_hooks", "buffer", "child_process", "cluster",
    "console", "constants", "crypto", "dgram", "diagnostics_channel",
    "dns", "domain", "events", "fs", "fs/promises", "http", "http2",
    "https", "inspector", "module", "net", "os", "path", "path/posix",
    "path/win32", "perf_hooks", "process", "punycode", "querystring",
    "readline", "repl", "stream", "stream/consumers", "stream/promises",
    "stream/web", "string_decoder", "sys", "timers", "timers/promises",
    "tls", "trace_events", "tty", "url", "util", "util/types", "v8",
    "vm", "wasi", "worker_threads", "zlib",
    "fsevents",
  ],
  conditions: ["import", "default"],
  mainFields: ["module", "main"],
  logLevel: "info",
  banner: {
    // Polyfills for CJS globals that don't exist natively in Node.js ESM:
    //   - require()   — used by react-dom/cjs, google-gax, etc.
    //   - __dirname / __filename — used by google-gax (firebase-admin dep)
    js: [
      "// Thera SSR — Vercel serverless function (bundled by scripts/build-vercel.mjs)",
      "import { createRequire } from 'node:module';",
      "import { fileURLToPath as __fileURLToPath } from 'node:url';",
      "import { dirname as __dirnameOf } from 'node:path';",
      "const require = createRequire(import.meta.url);",
      "const __filename = __fileURLToPath(import.meta.url);",
      "const __dirname = __dirnameOf(__filename);",
    ].join("\n"),
  },
});

// Clean up temp entry
import { unlinkSync } from "fs";
try { unlinkSync(resolve(funcDir, "entry.mjs")); } catch {}

console.log("✓ SSR function bundled to .vercel/output/functions/ssr.func/");
console.log("✓ Vercel output ready at .vercel/output/");
