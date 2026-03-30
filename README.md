# MiniGuard

A minimal re-implementation of AdGuard's core systems, built from scratch to understand how one of the world's most advanced ad blockers works internally — and the technical constraints it has to work around.

## Motivation

[AdGuard](https://adguard.com) serves over 150 million users across Windows, Mac, Android, iOS, and browser extensions. Under the hood it runs a sophisticated filtering pipeline: downloading and parsing filter lists with 100,000+ rules, matching every network request against those rules in microseconds using a shortcut-based engine, applying cosmetic rules to hide elements that can't be blocked at the network level, and executing scriptlets to neutralize anti-adblock scripts.

This project reverse-engineers those core systems at a minimal scale, using AdGuard's own real filter lists and mirroring the architecture of their open source libraries — [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter), [AGTree](https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree), and [TSWebExtension](https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/tswebextension).

## How it works

MiniGuard is built in three layers that directly mirror AdGuard's internal architecture:

**Pipeline** — Downloads the real [AdGuard Base Filter](https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt) (100k+ rules), parses it line by line using Node.js streams, classifies each rule by type (network, cosmetic, exception, scriptlet), and converts the convertible ones to Chrome's Declarative Net Request format. This mirrors what AdGuard's `pnpm resources:mv3` build step does internally.

**Matching Engine** — A standalone Node.js implementation of a shortcut-based URL matching engine, built to understand how AdGuard's [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter) works internally. It builds a lookup table at startup that reduces the search space from 90k+ rules to a handful of candidates per request. This is not used by the extension directly — in MV3, Chrome's DNR handles request matching — but it demonstrates the core algorithm that TSUrlFilter uses in production for rules that DNR cannot express (complex modifiers, `$third-party`, `$domain=`, etc.).

**Browser Extension** — A Manifest V3 Chrome extension that loads the converted rules, blocks matching network requests via the DNR API, injects cosmetic CSS rules into every page via a content script, and displays live blocking statistics in a popup. This mirrors the architecture of [AdGuard Browser Extension](https://github.com/AdguardTeam/AdguardBrowserExtension), which uses the same background service worker + content script split.

## Current state

- Successfully blocks ads on YouTube
- Blocks tracking requests across most major websites using the real AdGuard Base Filter rules
- Cosmetic rules hide ad elements that cannot be blocked at the network level
- Exception rules (`@@`) prevent false positives on legitimate sites
- Popup shows live blocked request count and last blocked domains
- Service worker state survives restarts via `chrome.storage.session`, mirroring how AdGuard handles the MV3 service worker lifecycle

## Technical challenges encountered

Building even a minimal version of AdGuard surfaces the same hard problems the AdGuard team deals with every day.

**Manifest V3 limitations** — Chrome's new extension platform replaced the powerful `webRequest` blocking API with Declarative Net Request — a static rule system with strict limits: 30,000 rules per ruleset, 5,000 dynamic rules, no runtime access to request bodies. AdGuard's response is to split their filters into multiple rulesets and handle everything DNR can't express (cosmetics, scriptlets, `$csp`, `$replace`) through their TSUrlFilter engine running in the service worker.

**Rule convertibility** — AdGuard's filter syntax is richer than what DNR can express. Modifiers like `$redirect`, `$csp`, `$replace`, `$hls`, and wildcard domain patterns (`||*.example.com^`) are rejected by Chrome. The pipeline must identify and skip these, which is exactly what AdGuard's `DeclarativeFilterConverter` class does during their build process.

**Exception rules** — Blocking rules without their corresponding exception rules (`@@`) breaks legitimate sites entirely. AdGuard maps exceptions to DNR `allow` rules with higher priority than block rules. Getting this priority system right is non-trivial at scale.

**Dynamic content** — CSS-based cosmetic rules work well for static HTML, but modern sites inject ad elements dynamically via JavaScript. Handling this correctly requires a `MutationObserver` — which is why AdGuard's content scripts observe DOM mutations continuously rather than running once on page load.

**Service worker lifecycle** — In MV3, the background service worker can be killed by the browser at any time, losing all in-memory state. AdGuard's solution is to persist every state change to `chrome.storage.session` and restore it on wake-up, reducing restart delay to under 200ms. MiniGuard implements the same pattern.

## Project structure

```
miniguard/
├── pipeline.mjs          # Downloads and parses the real AdGuard Base Filter
├── convert.mjs           # Converts network rules to DNR format
├── engine.mjs            # Standalone URL matching engine (educational — not used by the extension)
├── output/
│   ├── network_rules.json
│   └── cosmetic_rules.json
└── extension/
    ├── manifest.json
    ├── background.js     # Service worker — state management and DNR
    ├── content.js        # Injects cosmetic CSS rules into every page
    ├── popup.html
    ├── popup.js
    └── rules.json        # Generated DNR ruleset (from convert.mjs)
```

## What this is not

MiniGuard implements a small subset of what AdGuard does. It does not handle scriptlets, HTML filtering, extended CSS selectors, `$redirect` rules, stealth mode, or tracking protection. It processes one filter list instead of the dozens AdGuard maintains. The matching engine is a learning tool — in production, AdGuard uses [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter) directly. For actual privacy protection, use [AdGuard](https://adguard.com) or [uBlock Origin](https://github.com/gorhill/uBlock).

## References

- [AdGuard filter syntax — full documentation](https://adguard.com/kb/general/ad-filtering/create-own-filters/)
- [AdGuard Browser Extension — source code](https://github.com/AdguardTeam/AdguardBrowserExtension)
- [TSUrlFilter — AdGuard's filtering engine](https://github.com/AdguardTeam/tsurlfilter)
- [AGTree — AdGuard's filter list parser](https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree)
- [AdGuard on the Manifest V3 migration](https://adguard.com/en/blog/adguard-mv3.html)
- [Chrome Declarative Net Request API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)