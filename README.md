# BizAIPro MERN publishing platform

React 19, Express 5, MongoDB and server-rendered public pages. Custom `/admin` CMS supports posts and pages, drafts, scheduled publication, rich text, images, SEO checks, revisions, redirects and website settings.

## Local development

Requires Node 22 or later. Run `npm ci`, `npm run build`, then `npm run dev`. Development uses a local MongoDB process stored under `.local/`; it is never the production database. Set `IMPORT_WORDPRESS=true` to import the saved public export. `LOCAL_PORT` and `LOCAL_DB_NAME` allow isolated previews. Run `npm test` for API integration coverage.

## Migration

1. `npm run wordpress:export` captures published posts/pages. It does **not** capture drafts, private posts, users, plugin settings or full WordPress backups.
2. `node scripts/prepare-migration.mjs` captures live per-page SEO indexing state and referenced WordPress images into `exports/`.
3. Set private `MONGODB_URI`, then `npm run wordpress:import`. Original paths and category memberships are retained. Imported pages default to noindex if no verified source metadata exists. Imports do not replace existing article bodies.
4. `node scripts/verify-migration.mjs` checks public routes and migrated images at `VERIFY_URL` (default localhost:3001).

Images are stored in MongoDB, so application redeployment does not erase them. Original migrated image paths also resolve from MongoDB. Existing filesystem media remains supported for compatibility. JSON content export contains media metadata; use a proper MongoDB backup to retain image bytes and restore the complete database.

## Hostinger deployment

Business Web Hosting supports Node.js applications and externally hosted MongoDB. Deploy the ZIP as an Express/Other Node app on a **temporary Hostinger domain first**. Do not attach bizaipro.com during initial setup: Hostinger may immediately move the existing WordPress installation to a temporary domain.

- Node: 22 or later. Build: `npm ci && npm run build`. Start: `npm start` / entry `server/index.mjs`.
- Configure `MONGODB_URI` with database `bizaipro`, a random `SESSION_SECRET` (48+ characters), `NODE_ENV=production`, `SITE_URL=https://<staging-domain>`, `TRUST_PROXY` appropriate to the actual host proxy, and `ALLOW_INDEXING=false`.
- Allow only approved application egress addresses in Atlas. Do not silently open the network to all addresses.
- Create the owner account with `npm run admin:create` using private `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` (16+ characters). Remove the password environment variable immediately after setup. There is no public registration or default admin password.
- Import verified content/images, test sign-in and image uploads on staging, and verify route parity before domain cutover. Keep a recoverable WordPress backup and rollback domain plan.
- Set `SITE_URL=https://bizaipro.com` and `ALLOW_INDEXING=true` only at verified production cutover. Per-page noindex remains preserved.

## Hosting startup

The lightweight `server/index.mjs` listener starts before loading the database-backed application. Requests receive a non-cacheable HTTP 503 during initialization; once ready, they use the CMS app. This meets Hostinger's three-second listener requirement. Vite and its React plugin are production dependencies because Hostinger installs with NODE_ENV=production before building.

## Verification limits

Passing local tests is not a production deployment. Staging database connectivity, proxy cookie behavior, real owner login, backup/restore, private WordPress content migration and final domain/SSL cutover require separate verification. Free Atlas capacity is limited; monitor storage because uploaded images consume database space.
