# Privacy policy

**Cookie Policy Rejector collects no personal data.** No analytics, no crash reports, no logs, no identifiers, no accounts, no ads, no remote configuration. The extension sends nothing to us or to anyone else.

Last updated: 25 October 2026. Covers the extension on Chrome, Edge, Firefox and Safari, and the Safari companion app.

## Who we are

Cookie Policy Rejector is open-source software ([MIT licence](LICENSE)) published by the developer named on its store listing. For questions about this policy, [open an issue on GitHub](https://github.com/Ewi0/cookiePolicyRejectorRD/issues).

## What it reads, and why

| What | Why | Where it goes |
| --- | --- | --- |
| The text and buttons of each page | To find a cookie banner and press "Reject all" (or "Accept all" in approve mode) | Nowhere. It is checked in memory in that tab, then forgotten. |
| The address of the page (and of the page that embeds a consent iframe) | To apply the rules for known consent platforms, and to check whether you paused the extension on that site | Nowhere |
| The address of the active tab, when you open the popup | To show the site name and the **Pause on this site** button | Nowhere |
| Whether the extension runs in the active tab, when you open the popup | To tell you when a page needs a reload or site access | Nowhere |

It never types into any field, never reads or changes cookies, and leaves sign-in forms, search boxes and newsletter dialogs alone.

## What it stores on your device

Everything lives in the browser's extension storage, is visible only to this extension, and is deleted when you remove the extension.

| Key | Contents |
| --- | --- |
| `mode` | `reject` or `accept` |
| `paused` | The sites **you** paused, e.g. `{ "example.com": true }` |
| `stats` | Three counters: banners refused, approved, hidden |
| `debug` | Off unless you turn it on in the developer console |
| `tab:<number>` (session storage) | For the toolbar badge: up to 20 entries like `{ cmp: "OneTrust", action: "reject" }`. No addresses. Removed when the tab closes or the browser quits. |

There is no history of the sites you visit, and no log of any kind.

## What leaves your device

Nothing, on its own. The popup has two links, and they open a web page only when you click them:

- **Report** opens a new issue form on GitHub. Its address carries the extension's version number and nothing else. Nothing about you or the page you were on is included; the form contains only what you type into it yourself.
- **Donate** opens this project's page on GitHub.

On those pages, [GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) applies.

## Who we share data with

No one. We never receive any data, so there is nothing to share or sell.

## Retention and deletion

Settings stay in your browser until you change them or remove the extension, which deletes them. The per-tab list is cleared when the tab closes. We hold nothing about you, so there is nothing for us to delete.

## Your rights (GDPR)

We do not process personal data, so there is nothing for us to give you a copy of, correct or erase. Everything the extension keeps is on your device and under your control: remove the extension, or clear its data in the browser's extension settings.

## Permissions

- **Access to all websites** (`<all_urls>`). Chrome describes this as "Read and change all your data on all websites", and other browsers word it similarly. Cookie banners can appear on any site, and the extension has to see and press them there before they are painted. It uses this access only as described above.
- **`storage`**: keeps the settings and counters listed above on your device.
- **`scripting`**: right after you install it, the extension starts its own banner script in tabs that were already open, so those pages are covered without a reload. It runs only the script inside the extension, never code from the internet.

The full source is in [`extension/`](extension/): about 1,500 lines of plain JavaScript, with no dependencies and no minification. To check that it sends nothing, open the extension's service worker (`chrome://extensions` → **Inspect views**) and watch the **Network** tab while you browse. It stays empty.

## Safari app (macOS, iPhone, iPad)

The companion app only shows how to switch the extension on. It has no network code, no tracking SDKs and no logging. The native extension handler reads nothing and returns an empty reply.

## Chrome Web Store Limited Use

Cookie Policy Rejector's use of user data complies with the Chrome Web Store User Data Policy, including the [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use) requirements.

## Store declarations

- **Chrome Web Store / Edge Add-ons:** does not collect or use user data.
- **Firefox Add-ons:** `data_collection_permissions: none`.
- **App Store:** Data Not Collected.

## Donations

Donations are handled entirely by the platform you donate through, under that platform's privacy policy. The extension doesn't know whether you donated and never asks.

## Changes to this policy

If anything changes, this page and its date change first. A version that collected data would have to say so here, and in the store declarations, before it shipped.
