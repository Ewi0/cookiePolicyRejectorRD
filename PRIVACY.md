# Privacy

**Cookie Policy Rejector collects nothing.** No analytics, no crash reports, no accounts, no ads, no remote config. The extension makes no network requests at all, so nothing it sees can leave your device.

Last updated: 25 October 2026.

## What it reads, and why

| What | Why | Where it goes |
| --- | --- | --- |
| The text and buttons of each page | To find a cookie banner and press "Reject all" (or "Accept all" in approve mode) | Nowhere. It is checked in memory in that tab, then forgotten. |
| The address of the page (and of the page that embeds a consent iframe) | To apply rules for known consent platforms and to check whether you paused the extension on that site | Nowhere |
| The address of the active tab, when you open the popup | To show the site name and the **Pause on this site** button | Nowhere |

It never types into any field, never reads or changes cookies, and leaves sign-in forms, search boxes and newsletter dialogs alone.

## What it stores on your device

All of it lives in the browser's extension storage, is visible only to this extension, and is deleted when you remove the extension.

| Key | Contents |
| --- | --- |
| `mode` | `reject` or `accept` |
| `paused` | The sites **you** paused, e.g. `{ "example.com": true }` |
| `stats` | Three counters: banners refused, approved, hidden |
| `debug` | Off unless you turn it on in the developer console |
| `tab:<number>` (session storage) | For the toolbar badge: up to 20 entries like `{ cmp: "OneTrust", action: "reject" }`. No addresses. Removed when the tab closes or the browser quits. |

## Why the browser warns "Read and change all your data on all websites"

Cookie banners can appear on any site, and the extension has to see and click them there, before they paint. Browsers show that warning for every extension that runs on all sites (`<all_urls>`), whatever it does with that access. This one uses it only as described above. The full source is in [`extension/`](extension/): about 1,400 lines of plain JavaScript, no dependencies, no minification. You can check it yourself.

To check that it sends nothing, open the extension's service worker (`chrome://extensions` → **Inspect views**) and watch the **Network** tab while you browse. It stays empty.

## Safari app (macOS and iOS)

The companion app only shows how to switch the extension on. It has no network access code, no tracking SDKs and no logging. The native extension handler reads nothing and returns an empty reply.

## Store declarations

- **Chrome Web Store / Edge Add-ons:** does not collect or use user data.
- **Firefox (AMO):** `data_collection_permissions: none`.
- **App Store:** Data Not Collected.

## Donations

Donations are handled entirely by the platform you donate through, under that platform's privacy policy. The extension doesn't know whether you donated and never asks.

## Contact

Questions or concerns: open an issue on this repository.
