# WebKit engine fishing QA (not physical iPhone approval)

Run \`scripts/capture-webkit-fishing-cast.mjs\` through the dedicated
\`webkit-fishing-cast.yml\` workflow.

- Actual headless Playwright WebKit in 390×844 and 844×390.
- Uses a browser pointer drag beginning at the visible rod grip.
- Asserts native canvas dimensions, valid sea-landing preview, actual
  Cast→Retrieve transition, exactly one consumable bait and real PNG pixels.
- Failed screenshots and failures are never silently ignored.
- \`artifacts/orientation/webkit/evidence.json\` documents exact viewport and
  explicitly marks physical iPhone/PWA standalone gates as **unverified**.

This is an opt-in \`cameraPan=1&coneLoop=1\` test. It does not switch the
production Cast interface, approve candidate Harbor art, or close Issue #27.
