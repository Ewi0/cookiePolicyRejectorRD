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

## What every store asks for

- **Privacy policy URL:** `https://github.com/Ewi0/cookiePolicyRejectorRD/blob/main/PRIVACY.md`
- **Website:** `https://github.com/Ewi0/cookiePolicyRejectorRD`
- **Support URL:** `https://github.com/Ewi0/cookiePolicyRejectorRD/issues`
- **Icon:** `extension/icons/x-128.png`. The App Store takes its icon from the Xcode build.
- **Screenshots:** each store lists the sizes it accepts (the Chrome Web Store wants 1280×800 or 640×400). The popup is in `assets/screenshots/`. For full scenes, run `npm run serve` and capture panels from <http://127.0.0.1:4173/mockups/>. For the App Store, use the iOS Simulator (**File → Save Screen**) and the Mac app.
- **Category:** Privacy & Security. On the App Store: Utilities.

## Listing text

**Name:** Cookie Policy Rejector

**Summary** (the Chrome Web Store allows 132 characters):

> Refuses every cookie banner before you see it. Or approves them all. Either way, you never see one again.

**Description:**

> Cookie Policy Rejector answers every cookie banner before it appears.
>
> REFUSE (the default) presses "Reject all", "Only necessary", "Ablehnen", "Tout refuser" and their equivalents in about 25 languages. If a banner has no reject button, it opens the banner's settings and switches everything off. If a site gives no way to refuse, it hides the banner without answering, so no consent is given.
>
> APPROVE presses "Accept all" instead, for people who just want the banners gone.
>
> • Knows OneTrust, Cookiebot, Didomi, Usercentrics, Sourcepoint, TrustArc, Quantcast, Google, Osano, CookieYes, iubenda and dozens more, and finds unknown banners by their wording
> • Never presses "Subscribe", "Log in" or policy links, and leaves sign-in and newsletter forms alone
> • Pause it on any site with one click
> • Collects no data, makes no network requests, shows no ads, needs no account
> • Free and open source (MIT)

## Chrome Web Store

1. Register in the developer console (US$5, once) and verify your email address.
2. **New item** → upload the Chrome zip.
3. **Store listing:** paste the text above and add the icon, screenshots and category.
4. **Privacy practices:**
   - **Single purpose:** *Answers cookie consent banners (refuse or accept, as the user chooses) and hides them before they appear.*
   - **`storage`:** *Saves the user's choice of refuse or approve, the sites where they paused the extension, and a count of banners handled. Everything stays on the device.*
   - **Host permission (`<all_urls>`):** *Cookie banners appear on any website. The extension has to run on every page while it loads to find the banner and press its reject or accept button before the banner is shown. Page content is only checked on the device and is never stored or sent anywhere.*
   - **Remote code:** *No, I am not using remote code.*
   - **Data usage:** tick none of the data types, then tick the three certifications.
5. Submit for review.

Brave, Vivaldi, Opera, Arc, Orion and Android browsers that take Chrome extensions all install from this one listing.

## Microsoft Edge Add-ons

1. Register in Partner Center (free).
2. **Create new extension** → upload the Chrome zip.
3. Reuse the listing text, privacy policy URL and permission explanations above.
4. Submit.

Edge for Android only offers extensions that Microsoft selects, so this listing covers Edge on computers.

## Firefox Add-ons (desktop and Android)

1. Sign in to the Developer Hub (free).
2. **Submit a New Add-on** → **On this site** → upload the Firefox zip.
3. Tick both **Firefox** and **Firefox for Android**. The manifest already declares Android support.
4. **Source code:** answer no. The package is the readable source, with no bundler or minifier. If a reviewer asks about `content/prehide.css`, it is generated from `content/rules.js` by `npm run prehide`.
5. The manifest already declares that the add-on collects no data, which Firefox Add-ons asks every new add-on to state.
6. Paste the listing text and privacy policy URL, then submit.

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
