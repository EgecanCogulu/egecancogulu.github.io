/* Set this to the Measurement ID from your Google Analytics web data stream. */
(function () {
  'use strict';

  var measurementId = 'G-6CP4EDSG90';

  // Keep unconfigured installs, local previews, and embedded demos out of reports.
  if (!/^G-[A-Z0-9]+$/.test(measurementId) ||
      window.location.hostname !== 'egecancogulu.github.io' ||
      window.self !== window.top || window.__siteAnalyticsLoaded) {
    return;
  }
  window.__siteAnalyticsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
}());
