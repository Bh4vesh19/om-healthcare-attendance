# Deployment Steps

## Safe rollout
1. Pull the current production Firestore rules and export a database backup.
2. Create a staging Firebase Hosting target or staging branch deployment.
3. Copy `.env.example` to `.env.staging` and set the desired map provider values.
4. Run `npm install` if needed, then `npm run build:staging`.
5. Deploy staging first:
   `firebase use <staging-project>`
   `firebase deploy --only firestore:rules,hosting`
6. Verify on real devices:
   - admin login
   - staff login
   - GPS permission prompt
   - check-in/check-out
   - background/foreground warning behavior
   - in-range/out-of-range transitions around the 100m fence
7. Deploy production only after staging verification:
   `firebase use <production-project>`
   `npm run build`
   `firebase deploy --only firestore:rules,hosting`

## Zero-downtime notes
- The frontend changes are backward-compatible with existing attendance documents.
- New fields such as `trackingMode`, `lastZoneEntryAt`, `lastZoneExitAt`, and `zoneTransitionAt` are additive only.
- Existing records without those fields continue to render.
- Deploy Firestore rules first in staging, then production, before or together with the new frontend.

## Hosting checks
- Production hosting must be HTTPS. Geolocation will not work reliably on plain HTTP.
- Keep SPA rewrites enabled so refreshes on protected routes continue to work.
- Keep service-worker and HTML caching conservative during rollout.

## Post-deploy smoke test
- Confirm admin can see active staff updates without refresh.
- Confirm a staff device moving outside the 100m radius switches to `Out of Range` quickly.
- Confirm `gpsAccuracyMeters`, `distanceMeters`, and `locationLogs` are updating in Firestore.
- Confirm backgrounding the app shows the warning and resumes updates on return.
