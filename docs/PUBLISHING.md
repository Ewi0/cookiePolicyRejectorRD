# Publishing to every store

Four store listings put Cookie Policy Rejector on every device whose browser can run extensions. All of them take the files attached to a GitHub release (see [Shipping](../README.md#shipping)), or the ones `npm run build` writes to `dist/`.

| Store | Reaches | Cost | Upload |
| --- | --- | --- | --- |
| [Chrome Web Store](https://chrome.google.com/webstore/devconsole) | Chrome, Brave, Vivaldi, Opera, Arc and Orion on Windows, Mac, Linux and Chromebooks, plus Android browsers that install Chrome extensions | US$5 once | `cookie-policy-rejector-chrome-<v>.zip` |
| [Microsoft Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview) | Edge on Windows, Mac and Linux | Free | `cookie-policy-rejector-chrome-<v>.zip` |
| [Firefox Add-ons](https://addons.mozilla.org/developers/) | Firefox and its forks on Windows, Mac, Linux **and Android** | Free | `cookie-policy-rejector-firefox-<v>.zip` |
| [App Store Connect](https://appstoreconnect.apple.com/) | Safari on iPhone, iPad and Mac, in one listing | US$99 a year (Apple Developer Program) | Archive in Xcode |
| [Opera add-ons](https://addons.opera.com/developer/) (optional) | Opera, which can also install from the Chrome Web Store | Free | `cookie-policy-rejector-chrome-<v>.zip` |

Start with Firefox Add-ons and the Chrome Web Store. Between them they cover every desktop browser except Safari, and Android.

## Before the first upload (account owner)

- Chrome Web Store developer account: the US$5 fee is paid and **2-Step Verification** is on (without it you can neither publish nor update).
- Publisher profile: publisher name and a verified contact email. A physical address is only needed for paid features; this extension has none.
- Trader / non-trader declaration filled in. Publishing for a company makes you a trader; its legal name, address and phone number are then shown on the listing.
- A new publisher can have at most 2 published items.

## Package

1. Bump `version` in `extension/manifest.json` and `package.json`. Every upload needs a higher version than the last one.
2. Push a tag (`git tag v1.0.1 && git push origin v1.0.1`) and take `cookie-policy-rejector-chrome-<v>.zip` from the GitHub release, or run `npm run build`.
3. Upload the ZIP exactly as built: `manifest.json` sits at its root. CI runs the Chrome tests against this very ZIP, unzipped; to do the same locally, unzip it and run `CPR_EXTENSION=<folder> npm run test:chrome`.

## Store listing

**Name and summary** come from the package (`_locales/*/messages.json`), in 31 languages; the summary stays under 132 characters in each.

**Description** (paste as is; it avoids brand names and repeated keywords, which reviewers count as keyword spam):

> Cookie Policy Rejector answers consent pop-ups before they appear on screen.
>
> REFUSE (the default) presses “Reject all”, “Only necessary” and their equivalents in about 25 languages. If there is no reject button, it opens the settings and switches everything off. If a site offers no way to refuse, it hides the notice without answering, so no consent is given.
>
> APPROVE presses “Accept all” instead, for people who just want them gone.
>
> • Recognises the major consent platforms, and finds unknown notices by their wording
> • Never presses “Subscribe”, “Log in” or policy links, and leaves sign-in and newsletter forms alone
> • Pause it on any site with one click
> • Tells you when a page needs a reload or site access, and fixes it in one click
> • In 31 languages
> • Collects no data, makes no network requests, shows no ads, needs no account
> • Free and open source (MIT)

**Category:** Privacy & Security. **Language:** English.

**Images:** run `npm run store-assets`. It renders them from the real popup into `dist/store/`:

| File | Field | Required |
| --- | --- | --- |
| `icon-128.png` | Store icon: 96 px of artwork inside 16 px of transparent padding | Yes |
| `screenshot-1-refuse.png` … `screenshot-4-languages.png` | Screenshots, 1280×800, no alpha | At least 1 |
| `promo-small-440x280.png` | Small promo tile | No, but without it the listing ranks lower |
| `promo-marquee-1400x560.png` | Marquee promo tile | No (needed to be featured) |

**Website:** `https://github.com/Ewi0/cookiePolicyRejectorRD`. **Support:** `https://github.com/Ewi0/cookiePolicyRejectorRD/issues`.

## Privacy tab

| Field | Paste |
| --- | --- |
| Single purpose | Answers cookie consent banners on websites (refuse or accept, as the user chooses) and hides them before they appear. |
| `storage` | Saves the user's choice of refuse or approve, the sites where they paused the extension, and a count of banners handled. Stored on the device only; nothing is transmitted. |
| `scripting` | Right after installation, injects the extension's own bundled content script into tabs that were already open, so cookie banners there are handled without a reload. No remote code: only files inside the package. |
| Host permission (`<all_urls>`) | Cookie banners appear on any website. The content script must run on every page while it loads to find the banner and press its reject or accept button before it is shown. Page content is checked on the device only and is never stored or transmitted. |
| Remote code | No, I am not using remote code. |
| Data usage | Tick none of the data types, then tick the three certifications. |
| Privacy policy URL | `https://github.com/Ewi0/cookiePolicyRejectorRD/blob/main/PRIVACY.md` |

The privacy policy link must work when you submit, so `PRIVACY.md` has to be on the `main` branch first.

## Distribution

Public, all regions.

## Test instructions (for the reviewer)

> No account or login is needed.
> 1. Open https://www.cookiebot.com/en/ or https://www.didomi.io/ . Both show a cookie banner to visitors in the EU. With the extension it never appears: it was refused before it was drawn.
> 2. Click the toolbar icon. The popup shows the site, which consent platform was answered and how (for example "COOKIEBOT — REFUSED"), and the lifetime counter.
> 3. Switch to APPROVE, open a third site with a banner (https://www.onetrust.com/): the extension accepts instead.
> 4. Click "PAUSE ON THIS SITE" and reload: the banner shows normally.
> Banners depend on the visitor's region; sites usually show them to EU visitors.

## If the review comes back

| Code | Means | In this project |
| --- | --- | --- |
| Purple Potassium | Permissions not needed | Each permission above is used; quote its justification. |
| Blue Argon | Remote code | None: everything runs from the package, and the CSP allows only `'self'`. |
| Yellow Magnesium | Doesn't work as described | Banners depend on region: point the reviewer to the test instructions. |
| Yellow Argon | Keyword spam | Use the description above unchanged. |
| Yellow Zinc | Missing icon, screenshots or description | Re-run `npm run store-assets`. |
| Purple Lithium | Privacy policy missing or broken | Check that `PRIVACY.md` is on `main` and the URL opens. |

Fix, raise the version, upload the new ZIP and submit again. To disagree with a decision, use **Appeal** on the item's page in the dashboard.

## Microsoft Edge Add-ons

1. Register in Partner Center (free).
2. **Create new extension** → upload the Chrome zip.
3. Reuse the description, images, privacy policy URL and permission justifications above.
4. Submit.

Edge for Android only offers extensions that Microsoft selects, so this listing covers Edge on computers.

## Firefox Add-ons (desktop and Android)

1. Sign in to the Developer Hub (free).
2. **Submit a New Add-on** → **On this site** → upload the Firefox zip.
3. Tick both **Firefox** and **Firefox for Android**. The manifest already declares Android support.
4. **Source code:** answer no. The package is the readable source, with no bundler or minifier. If a reviewer asks about `content/prehide.css`, it is generated from `content/rules.js` by `npm run prehide`.
5. The manifest already declares that the add-on collects no data, which Firefox Add-ons asks every new add-on to state.
6. Paste the description and the privacy policy URL, then submit.

## App Store (iPhone, iPad and Mac)

1. Join the Apple Developer Program (US$99 a year).
2. Open `safari/Cookie Policy Rejector/Cookie Policy Rejector.xcodeproj`. Under **Signing & Capabilities**, pick your team for all four targets. If the bundle id `app.cookiepolicyrejector.CookiePolicyRejector` is taken, change it in all four. Don't commit the `DEVELOPMENT_TEAM` line Xcode adds to `project.pbxproj`.
3. Set **Version** (`MARKETING_VERSION`) to the version in `extension/manifest.json`, and raise **Build** (`CURRENT_PROJECT_VERSION`) for every upload.
4. In App Store Connect, create one app with that bundle id and add both iOS and macOS. The iPhone/iPad app and the Mac app share the bundle id, so they become one listing with universal purchase.
5. In Xcode, choose the **Cookie Policy Rejector (iOS)** scheme and **Any iOS Device**, then **Product → Archive → Distribute App → App Store Connect**. Repeat with the **Cookie Policy Rejector (macOS)** scheme.
6. In App Store Connect: **App Privacy → Data Not Collected**, the privacy policy URL, category Utilities, screenshots for iPhone, iPad and Mac, and price Free.
7. Review notes: *The app contains a Safari extension. To test it, open Settings → Apps → Safari → Extensions → Cookie Policy Rejector, turn it on and allow All Websites, then visit any site that shows a cookie banner.*

## Shipping an update

1. Bump the versions and push a tag (see [Shipping](../README.md#shipping)).
2. Download the zips from the new GitHub release.
3. Upload them as a new version in the Chrome Web Store, Edge and Firefox dashboards. For the App Store, archive and upload a new build in Xcode.
