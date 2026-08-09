# Universal Links implementation and verification

Last updated: August 8, 2026

## Outcome

Forum notification and shared-content URLs use the permanent HTTPS origin
`https://forumeveryside.com`. The website now advertises the iOS app through
Apple Universal Links:

- On an iPhone with a future Forum build containing the associated-domain
  entitlement, tapping an eligible link can open the corresponding screen in
  the app.
- If Forum is not installed, the same URL continues to work in the web app.
- On desktop browsers, the URL stays in the web app.
- Safari pages include Apple's Smart App Banner metadata as a secondary,
  user-controlled way to open or install Forum.

Universal Links are intentionally limited to navigation destinations. Account
verification, password-reset, privacy, support, and authentication URLs remain
web actions and are not claimed by the app.

## Identifiers and route scope

- Domain: `forumeveryside.com`
- Apple Team ID: `93TVYH2DU3`
- iOS bundle identifier: `com.michaeltan.forum`
- AASA application identifier: `93TVYH2DU3.com.michaeltan.forum`
- App Store Connect Apple ID: `6795639287`

The associated route families are:

- `/post/*`
- `/article/*`
- `/summary/*`
- `/debate/*`
- `/user/*`
- `/dm/*`
- `/follow-requests`
- `/brief/*`

These paths correspond to real Expo Router screens. Authenticated destinations
continue to use the existing route-context behavior: a signed-out visitor is
sent through authentication, and the requested destination is retained for the
authenticated session. Private or unavailable content remains subject to the
same backend authorization rules as ordinary in-app navigation.

## Implementation changes

### iOS application

`app.json` adds `applinks:forumeveryside.com` to
`expo.ios.associatedDomains`. Expo prebuild converts it into the
`com.apple.developer.associated-domains` entitlement. This entitlement only
takes effect in a newly compiled native binary; it cannot be added to an
already-uploaded TestFlight build through JavaScript or a website deployment.

The post detail route now handles direct-link loading explicitly. A missing,
deleted, blocked, or malformed post displays a loading or unavailable state
instead of leaving an empty screen.

### Website

`public/.well-known/apple-app-site-association` declares the application ID and
route scope. `public/_headers` serves the extensionless file as
`application/json; charset=utf-8` and prevents MIME sniffing.

The post-export script adds this Smart App Banner tag to the exported HTML:

```html
<meta name="apple-itunes-app" content="app-id=6795639287" />
```

No automatic custom-scheme redirect or forced-open interstitial was added.
Those patterns can produce broken prompts, duplicate navigation, or poor
fallback behavior. Apple Universal Links provide the install-aware handoff;
the normal web page remains the fallback.

### Validation

`npm run check:universal-links` verifies all of the following together:

- the configured iOS bundle identifier;
- the associated domain;
- the Apple Team ID and bundle ID in the AASA file;
- the exact associated route list;
- the existence of an Expo Router screen for every route;
- the Cloudflare AASA content-type rule;
- the Smart App Banner App Store ID; and
- the canonical public-link domain.

This is separate from `npm run check:deep-links`, which verifies that backend
notification paths resolve to client screens.

## Deployment performed

The production web export was built locally and deployed to the existing
Cloudflare Pages project `forum-web`.

- Preview branch: `universal-links`
- Preview deployment: `3506954d-23b4-4324-bc2c-4c1c3a79a750`
- Production branch: `main`
- Latest production deployment: `63fe3c03.forum-web-6tw.pages.dev`

The preview and production artifacts are identical. The first apex-domain
request briefly reached the preceding deployment while Cloudflare switched the
custom domain. The final no-query production check returned:

- HTTP `200`
- `Content-Type: application/json; charset=utf-8`
- the expected `93TVYH2DU3.com.michaeltan.forum` identifier
- all eight expected route families

At the initial check, Apple's associated-domains CDN still returned its cached
pre-deployment `404 / Bad JSON content` response. That response had a one-hour
cache lifetime. Recheck after the cache expires:

```bash
curl -sS -D - \
  https://app-site-association.cdn-apple.com/a/v1/forumeveryside.com
```

Do not change the AASA file merely because Apple's CDN has not refreshed yet.
First confirm the apex URL still returns the correct JSON without a redirect.

## Tests completed

The following checks passed on August 8, 2026:

- `npm run check:universal-links`
- `npm run check:deep-links`
- `npm run typecheck`
- `npm run lint`
- `npm run web:export`
- `npx expo-doctor` (`20/20 checks passed`)
- `npx expo config --type public --json`
- `npx expo prebuild --platform ios --no-install`
- direct Xcode Debug build for the iOS 26.5 iPhone 17 Pro simulator
- simulator-signed rebuild and launch without the earlier notification keychain
  error produced by the deliberately unsigned diagnostic build
- custom-scheme route test for a nonexistent post, which displayed
  `Post not found` rather than a blank or crashed screen
- Cloudflare preview AASA status, MIME type, JSON contents, and Smart App Banner
- Cloudflare production AASA status, MIME type, JSON contents, and Smart App
  Banner
- canonical `www` redirect to the associated apex domain

The Xcode build emitted warnings inside React Native/Expo dependencies and
always-run CocoaPods build phases. It completed with `BUILD SUCCEEDED`; no Forum
TypeScript error or native compilation failure occurred.

Expo Doctor initially identified six SDK 57 packages that were one patch
version behind. They were updated to Expo's expected SDK 57 patch versions and
Doctor, CocoaPods, the web export, and the iOS 26.5 simulator build all passed
again. The non-breaking `npm audit fix` reduced the audit total; the remaining
advisories are in Expo/Metro/Xcode build-tool dependency chains. The suggested
forced remediation would downgrade Expo to SDK 53 or force another breaking
package change, so it was deliberately not applied.

## Simulator limitations

The simulator is useful for Expo Router and error-state validation, but it
cannot finish the trust-chain test for the production application identifier.
Simulator builds use a synthetic `FAKETEAMID`, whereas production AASA correctly
lists the real Team ID. Apple's Smart App Banner also does not appear in the iOS
simulator. Consequently, the production HTTPS test correctly remained in
Safari during this local-only verification.

Do not add `FAKETEAMID` to the production AASA file simply to make a simulator
test pass.

## Required physical-device check before the next TestFlight release

No TestFlight build was created during this implementation. When the next
release candidate is intentionally built:

1. Confirm Apple's CDN returns the current AASA JSON.
2. Build the new production binary and confirm its signed entitlements contain
   `applinks:forumeveryside.com`.
3. Install that exact build on a physical iPhone through TestFlight.
4. Place a real Forum post, article, Floor, profile, DM, and follow-request URL
   in Mail or Notes and tap each one. Do not judge Universal Links by typing the
   URL into Safari's address bar; iOS commonly keeps same-domain/address-bar
   navigation in Safari.
5. Test while signed in, while signed out, and after force-quitting the app.
6. Confirm an unauthorized or deleted target shows a useful unavailable state.
7. Delete Forum and tap the same URLs again; each must render in the web app.
8. Reinstall Forum and repeat the test. If a prior user preference keeps the
   link in Safari, use the page's app banner or the system's Open in Forum
   affordance to restore the app preference.
9. Test at least one real notification email on the physical device. The email
   must use the HTTPS URL, not a `forum://` URL, so the website remains a valid
   fallback.

## References

- [Apple: Supporting associated domains](https://developer.apple.com/documentation/Xcode/supporting-associated-domains)
- [Apple: Debugging Universal Links](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links)
- [Apple: Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners)
- [Expo: iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/)
- [Cloudflare: Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
