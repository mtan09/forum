#!/usr/bin/env node
// Every notification carries an in-app path, and nothing else checks that the
// path still names a real screen. Renaming a route silently turns a tap into a
// no-op — which is exactly how the 9am Floor reminder stopped working.
//
// This walks the expo-router tree under app/, turns each file into the route it
// serves, and asserts every path a notification can emit resolves to one.
//
// The authoritative list of server-sent paths lives in the API repo
// (../forum-api/src/lib/notification-routes.ts). It is read when that checkout
// is present and skipped with a notice when it is not, so this stays runnable
// from a lone clone.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'app');
const apiRoutesFile = resolve(root, '../forum-api/src/lib/notification-routes.ts');

// Paths the client schedules for itself. Server-sent paths come from the API
// repo; these do not exist there.
const LOCAL_PATHS = ['/debate'];

const ROUTE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return [full];
  });
}

/** `app/(tabs)/debate.tsx` -> `/debate`; `app/post/[id].tsx` -> `/post/:param`. */
function toRoutePattern(file) {
  let rel = relative(appDir, file);
  const ext = ROUTE_EXTENSIONS.find((candidate) => rel.endsWith(candidate));
  if (!ext) return null;
  rel = rel.slice(0, -ext.length);
  // Platform variants (`foo.web`, `foo.ios`) serve the same route as the base.
  rel = rel.replace(/\.(web|ios|android|native)$/, '');
  // Layouts and expo-router specials are not navigable destinations.
  if (rel.split('/').some((segment) => segment.startsWith('_') || segment.startsWith('+'))) {
    return null;
  }
  const segments = rel
    .split('/')
    // Group folders are organisational and absent from the URL.
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .filter(Boolean);
  if (segments.at(-1) === 'index') segments.pop();
  const pattern = segments
    // [id] and [...rest] both match one supplied value in our links.
    .map((segment) => (segment.startsWith('[') ? ':param' : segment))
    .join('/');
  return `/${pattern}`;
}

/** A concrete path like `/post/abc` -> `/post/:param` for comparison. */
function normalizeLink(path) {
  const [withoutQuery] = path.split('?');
  const segments = withoutQuery.split('/').filter(Boolean);
  return `/${segments.map((segment) => (segment.startsWith(':') ? ':param' : segment)).join('/')}`;
}

/**
 * Pulls emittable paths out of the API's route builders by reading their
 * template literals — `(id: string) => \`/post/${id}\`` yields `/post/:param`.
 */
function apiPaths() {
  let source;
  try {
    source = readFileSync(apiRoutesFile, 'utf8');
  } catch {
    return null;
  }
  // Comments in that file quote example paths (`/debate/undefined`) that are
  // deliberately not routes; scanning them would fail the check spuriously.
  source = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found = new Set();
  for (const [, body] of source.matchAll(/`(\/[^`]*)`/g)) {
    found.add(normalizeLink(body.replace(/\$\{[^}]*\}/g, ':param')));
  }
  for (const [, literal] of source.matchAll(/=\s*'(\/[^']*)'/g)) {
    found.add(normalizeLink(literal));
  }
  return [...found];
}

const routes = new Set(
  walk(appDir)
    .map(toRoutePattern)
    .filter(Boolean)
);

const fromApi = apiPaths();
const checking = [...LOCAL_PATHS, ...(fromApi ?? [])];

if (fromApi === null) {
  console.warn(
    `! ../forum-api not found — checked only client-scheduled paths.\n` +
      `  Clone it alongside this repo to cover server-sent notifications too.`
  );
}

const missing = checking.filter((path) => !routes.has(normalizeLink(path)));

if (missing.length) {
  console.error('✗ notification paths with no matching screen:\n');
  for (const path of missing) console.error(`    ${path}`);
  console.error(`\n  Known routes:\n${[...routes].sort().map((r) => `    ${r}`).join('\n')}`);
  process.exit(1);
}

console.log(
  `✓ ${checking.length} notification path(s) resolve to a screen ` +
    `(${routes.size} routes scanned)`
);
