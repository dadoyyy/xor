# Privacy Policy & Store Listing Notes

## Release Hygiene (Play Store)

- Keystores and signing secrets must never be committed to version control.
- `versionCode` increments are automated via EAS (`apps/mobile/eas.json`) and CI.
- Production Android builds use Android App Bundle (`app-bundle` / `.aab`).

