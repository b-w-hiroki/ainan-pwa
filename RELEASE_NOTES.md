# AINAN Release Candidate Notes

## v1.0.0-rc.1

Release candidate focused on completion quality rather than new features.

### Core loop
- Fishing → catch result → town growth → workshop/services → collection
- Daily challenges, achievements, titles and Save v3
- Three differentiated fishing locations
- Three boss encounters with phase-specific presentation

### Final presentation
- Location atmosphere pass
- Player fishing reaction pass
- Shared rarity/reward presentation language
- Home / Menu / Footer UI glyph unification
- Boss trophy / record / challenge presentation
- 390×844 mobile visual QA coverage

### Reliability
- Save v3 checksum, migration and rolling backups
- Export / import / restore
- PWA manifest, install icon and service worker readiness checks
- Safe-area and dynamic viewport support
- Automated build, smoke QA, mobile E2E and screenshot guard

### Remaining release gate
Physical iPhone QA tracked in GitHub Issue #27:
Safari/PWA safe-area, audio unlock, haptics, persistence after relaunch,
background resume, boss playthrough, sustained performance and device heat.
