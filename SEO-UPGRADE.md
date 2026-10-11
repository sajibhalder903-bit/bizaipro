# SEO publishing upgrade — 2026-10-06

Implemented in the local MERN project. Production deployment is a separate step; the existing live website does not receive local file changes automatically.

## সম্পাদকদের জন্য

1. **SEO overview** খুলুন। Title search এবং Draft / Published / Scheduled filter দিয়ে content খুঁজুন। **Improve** থেকে editor খুলুন।
2. **SEO writing assistant**-এ heading outline, word count, internal/external link ও body image count দেখুন। **Find links** শুধু published, indexable page খোঁজে। Copy URL করে visual editor-এর Add link ব্যবহার করুন।
3. **Suggest description from content** excerpt অথবা article থেকে একটি সংক্ষিপ্ত description তৈরি করে। এটি AI generation নয়; publish-এর আগে ভাষা ঠিক করুন। Existing description replace করার আগে confirmation আসে।
4. Search appearance-এ desktop/mobile preview দেখুন। Fallback title-এ website name অন্তর্ভুক্ত থাকে, public page-এর title-এর সঙ্গে একই logic ব্যবহার করে।
5. **Publish**, **Schedule**, অথবা published/scheduled entry-এর **Save** চাপলে review আসে। Noindex, server-wide indexing, headings, alt text, duplicate title/description এবং একই focus phrase-এর অন্য content দেখুন। **Back to editor** দিয়ে ঠিক করুন বা ইচ্ছাকৃত settings হলে confirm করুন।
6. Body image insert করার সময় alt text দিন। Decorative image হলে খালি alt রাখা যায়।

Draft save-এ review বাধ্যতামূলক নয়। Review advisory; API publication validation আগের মতোই বহাল। Score কোনো Google ranking/traffic prediction নয়। Duplicate checks সর্বোচ্চ 20 metadata match এবং 10 focus-phrase match দেখায়। Link finder সর্বোচ্চ 10 result দেখায়। Audit 30 entry করে paginated।

## Verification

- `npm test`: API authentication/CSRF, duplicate metadata, self-exclusion, draft filtering, heading/image/link analysis and existing publishing coverage.
- `npm run build`: client and SSR production bundles.
- `npm run test:ui`: isolated disposable MongoDB, login, SEO overview, description helper, publish review, mobile screenshot and confirmed publication. Requires Google Chrome installed. Screenshots go to ignored `.local/seo-verification/`. Never connects to the production database.

## Deploying the update

Use the existing Hostinger Node application. Retain its current MONGODB_URI, SESSION_SECRET, SITE_URL, ALLOW_INDEXING and TRUST_PROXY configuration. Deploy the release ZIP, build with `npm ci && npm run build`, start with `npm start`. No database migration or password reset is required. Keep the prior application release for rollback; take the normal database backup before production deployment.

After deployment, sign in at `/admin`, verify SEO overview and a draft's review dialog, and confirm `/api/health` returns 200. Do not publish disposable test content on production. Existing content is not rewritten by this upgrade.

Editorial guidance references: [Google title links](https://developers.google.com/search/docs/appearance/title-link), [Google snippets](https://developers.google.com/search/docs/appearance/snippet), [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
