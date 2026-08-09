import { createHash } from 'node:crypto';
import { copyFile, readFile, writeFile } from 'node:fs/promises';

const indexUrl = new URL('../dist/index.html', import.meta.url);
const webAssets = [
  {
    key: 'favicon',
    source: new URL('../assets/images/favicon.png', import.meta.url),
    prefix: 'forum-favicon',
  },
  {
    key: 'appleTouchIcon',
    source: new URL('../assets/images/apple-touch-icon.png', import.meta.url),
    prefix: 'forum-apple-touch-icon',
  },
  {
    key: 'icon192',
    source: new URL('../assets/images/web-icon-192.png', import.meta.url),
    prefix: 'forum-icon-192',
  },
  {
    key: 'icon512',
    source: new URL('../assets/images/web-icon-512.png', import.meta.url),
    prefix: 'forum-icon-512',
  },
];

const preparedAssets = Object.fromEntries(
  await Promise.all(
    webAssets.map(async ({ key, source, prefix }) => {
      const bytes = await readFile(source);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
      return [key, { source, name: `${prefix}-${hash}.png` }];
    })
  )
);

const html = await readFile(indexUrl, 'utf8');
const faviconTag = /<link\s+rel=["']icon["']\s+href=["']\/favicon\.ico["']\s*\/?>/;

if (!faviconTag.test(html)) {
  throw new Error('Expo export did not contain the expected favicon link.');
}

const manifest = {
  name: 'forum: Every Side',
  short_name: 'forum',
  start_url: '/',
  display: 'standalone',
  background_color: '#FFFFFF',
  theme_color: '#B647FF',
  icons: [
    {
      src: `/${preparedAssets.icon192.name}`,
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: `/${preparedAssets.icon512.name}`,
      sizes: '512x512',
      type: 'image/png',
    },
  ],
};
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));
const manifestHash = createHash('sha256').update(manifestBytes).digest('hex').slice(0, 12);
const manifestName = `forum-manifest-${manifestHash}.webmanifest`;

const iconMarkup = [
  `<link rel="icon" type="image/png" sizes="48x48" href="/${preparedAssets.favicon.name}" />`,
  `<link rel="shortcut icon" type="image/png" href="/${preparedAssets.favicon.name}" />`,
  `<link rel="apple-touch-icon" sizes="180x180" href="/${preparedAssets.appleTouchIcon.name}" />`,
  `<link rel="manifest" href="/${manifestName}" />`,
  '<meta name="theme-color" content="#B647FF" />',
  '<meta name="apple-mobile-web-app-title" content="forum" />',
  '<meta name="apple-itunes-app" content="app-id=6795639287" />',
].join('\n    ');

const shareDescription =
  'Compare political coverage, hear community perspectives, and find where you stand.';
const shareMarkup = [
  `<meta name="description" content="${shareDescription}" />`,
  '<meta property="og:site_name" content="forum: Every Side" />',
  '<meta property="og:title" content="forum: Every Side" />',
  `<meta property="og:description" content="${shareDescription}" />`,
  '<meta property="og:type" content="website" />',
  '<meta property="og:image" content="https://forumeveryside.com/forum-share-preview.png" />',
  '<meta property="og:image:width" content="512" />',
  '<meta property="og:image:height" content="512" />',
  '<meta name="twitter:card" content="summary" />',
  '<meta name="twitter:title" content="forum: Every Side" />',
  `<meta name="twitter:description" content="${shareDescription}" />`,
  '<meta name="twitter:image" content="https://forumeveryside.com/forum-share-preview.png" />',
].join('\n    ');

const updatedHtml = html
  .replace(faviconTag, iconMarkup)
  .replace('<title>forum</title>', `<title>forum: Every Side</title>\n    ${shareMarkup}`);

await Promise.all([
  ...Object.values(preparedAssets).map(({ source, name }) =>
    copyFile(source, new URL(`../dist/${name}`, import.meta.url))
  ),
  copyFile(preparedAssets.icon512.source, new URL('../dist/forum-share-preview.png', import.meta.url)),
  writeFile(new URL(`../dist/${manifestName}`, import.meta.url), manifestBytes),
  writeFile(indexUrl, updatedHtml),
]);

console.log(
  `Prepared cache-busted web icons: /${preparedAssets.favicon.name}, /${preparedAssets.appleTouchIcon.name}`
);
