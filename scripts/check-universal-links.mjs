#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const associationPath = join(root, 'public/.well-known/apple-app-site-association');
const association = JSON.parse(readFileSync(associationPath, 'utf8'));
const headers = readFileSync(join(root, 'public/_headers'), 'utf8');
const webPrep = readFileSync(join(root, 'scripts/prepare-web-export.mjs'), 'utf8');
const publicLinks = readFileSync(join(root, 'lib/public-links.ts'), 'utf8');

const DOMAIN = 'forumeveryside.com';
const TEAM_ID = '93TVYH2DU3';
const BUNDLE_ID = 'com.michaeltan.forum';
const APP_STORE_ID = '6795639287';
const ROUTES = [
  { component: '/post/*', file: 'post/[id].tsx' },
  { component: '/article/*', file: 'article/[id].tsx' },
  { component: '/summary/*', file: 'summary/[id].tsx' },
  { component: '/debate/*', file: 'debate/[id].tsx' },
  { component: '/user/*', file: 'user/[id].tsx' },
  { component: '/dm/*', file: 'dm/[userId].tsx' },
  { component: '/follow-requests', file: 'follow-requests.tsx' },
  { component: '/brief/*', file: 'brief/[date].tsx' },
];
const EXPECTED_COMPONENTS = ROUTES.map(({ component }) => component);

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(config.ios?.bundleIdentifier === BUNDLE_ID, `bundle identifier must be ${BUNDLE_ID}`);
assert(
  config.ios?.associatedDomains?.includes(`applinks:${DOMAIN}`),
  `ios.associatedDomains must contain applinks:${DOMAIN}`
);

const details = association.applinks?.details;
assert(Array.isArray(details) && details.length === 1, 'AASA must contain one applinks detail');
const detail = details?.[0] ?? {};
assert(
  detail.appIDs?.includes(`${TEAM_ID}.${BUNDLE_ID}`),
  `AASA appIDs must contain ${TEAM_ID}.${BUNDLE_ID}`
);
const components = (detail.components ?? []).map((component) => component['/']);
assert(
  JSON.stringify(components) === JSON.stringify(EXPECTED_COMPONENTS),
  `AASA components must exactly match ${EXPECTED_COMPONENTS.join(', ')}`
);

for (const { component, file } of ROUTES) {
  assert(existsSync(join(root, 'app', file)), `AASA path ${component} has no Expo Router screen`);
}

assert(
  headers.includes('/.well-known/apple-app-site-association') &&
    /Content-Type:\s*application\/json/i.test(headers),
  'Cloudflare headers must serve the AASA file as application/json'
);
assert(
  webPrep.includes(`app-id=${APP_STORE_ID}`),
  `web export must include Smart App Banner app-id=${APP_STORE_ID}`
);
assert(
  publicLinks.includes(`https://${DOMAIN}`),
  `shared public links must use canonical domain ${DOMAIN}`
);

if (failures.length) {
  console.error('✗ Universal Link configuration errors:\n');
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log(
  `✓ Universal Links associate ${TEAM_ID}.${BUNDLE_ID} with ${EXPECTED_COMPONENTS.length} route families on ${DOMAIN}`
);
