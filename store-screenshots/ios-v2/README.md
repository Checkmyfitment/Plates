# New App Store screenshots (captioned, 1320x2868 = 6.9" iPhone)

Made 2026-10-23 for the "Pass the Plates" rename. Captions use search words on
purpose ("homemade food", "home cooks", "tamales", "sourdough").

Upload in App Store Connect -> the version -> App Previews and Screenshots ->
6.9" Display (one set is enough; Apple scales it down for smaller phones), in
this order: 01, 02, 03, 04. This needs a version in "Prepare for Submission",
so add them to the NEXT version (1.2.1 is already in review).

Regenerate with `python3 scripts/make-store-screenshots.py <raw-dir> <out-dir>`.
Google Play needs separate screenshots from an Android device or emulator
(its aspect-ratio limit is 2:1, and these show an iPhone status bar), so
these are iOS-only.
