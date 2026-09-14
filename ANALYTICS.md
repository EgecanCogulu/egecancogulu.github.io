# Google Analytics

The site is served as static HTML (`.nojekyll`), so the analytics settings in
`_config.yml` do not apply to the current pages.

The configured GA4 measurement ID is `G-6CP4EDSG90`.

## Verify tracking or change the property

1. Sign in at https://analytics.google.com/ with a Google account you control.
   Check your other Google accounts if you are looking for an existing property.
   If necessary, create a GA4 property and a Web data stream for
   `https://egecancogulu.github.io`.
2. Under **Admin → Data streams**, open the website stream and copy its
   **Measurement ID** (`G-…`).
3. Set `measurementId` in `assets/js/analytics.js` to that ID, then deploy the site.
   Clearing the ID disables tracking.
4. Open the live site and check **Reports → Realtime** in Analytics. Use Google
   Tag Assistant (https://tagassistant.google.com/) to troubleshoot if needed.
   Browser tracking blockers can prevent collection.

The shared script tracks page views on the homepage, resume, blog articles, and
standalone simulation pages. Enable Enhanced measurement in the web stream for
automatic scroll, outbound-link, and file-download events. Local previews and
embedded demos are excluded. If the site moves to a custom domain, update the
hostname check in the script.

For new pages, add `<script defer src="/assets/js/analytics.js"></script>` in
the HTML head. Do not add a second GA4 or Tag Manager installation for the same
property: it can duplicate page views.

The Google site-verification token is for ownership verification and cannot identify or
grant access to an Analytics account. A new property collects new traffic;
access to previous reports requires access to the original property.

Google documentation: https://developers.google.com/tag-platform/gtagjs
