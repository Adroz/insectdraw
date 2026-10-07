---
status: accepted
---

# The daily plate is a GitHub Pages deploy and the day boundary is Brisbane midnight

The e-ink panel (ESPHome on an ESP32) needs a stable, unauthenticated URL for a 1-bit PNG.
GitHub Actions artifacts were rejected: 90-day retention, authenticated download, zip
unpacking, none of which a microcontroller does. Committing the PNG daily was rejected: the
repo would grow forever for a file nobody reviews. We decided a scheduled workflow renders the
daily plate (PNG at device size 440, SVG, JSON) and deploys it with the site through Pages from
a build artifact, so the Pages source switches from branch deploy to Actions deploy and the
site itself is published by the same workflow. The seed date is the Brisbane calendar day
(UTC+10, no daylight saving) rather than UTC, so the plate changes at local midnight on the
panel and on the web page alike; the cron fires at 14:00 UTC.

## Consequences

- A failed daily render fails the deploy and the previous plate stays live; nothing half-updates.
- Any consumer computing the seed itself must use the Brisbane day; the LAN render service in
  crowpanel-ha currently uses UTC and is to be retired or pointed at the Pages URL.
- The site is served by Pages over HTTPS only; a panel that cannot do TLS keeps a LAN proxy
  that caches the Pages PNG.
