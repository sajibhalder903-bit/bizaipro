# BizAIPro Studio — ব্যবহার নির্দেশিকা

Admin panel: https://bizaipro.com/admin
Website: https://bizaipro.com/
Login email: admin@bizaipro.com
Password: private .local/admin-access.txt file-এ আছে।

- Posts → New post: blog লিখুন; title, URL slug, category ও cover image দিন। Save করে draft রাখুন, review শেষে Publish করুন।
- Pages: existing page edit করুন বা নতুন page তৈরি করুন।
- Editor: rich text অথবা HTML দিয়ে লিখুন; image, link ও heading যোগ করুন। SEO title, description ও image alt text সেট করুন।
- Media library: image upload, reuse ও metadata manage করুন। Image MongoDB-তে সংরক্ষিত হয়।
- Website settings: site name, homepage hero, logo, navigation ও footer-এর supported settings বদলান।
- Revision history: পুরোনো content version দেখুন ও restore করুন।
- Redirects: পুরোনো URL থেকে নতুন URL-এ redirect তৈরি করুন।
- Sign out: কাজ শেষে logout করুন।

Published content-এর পরিবর্তন live website-এ দেখা যাবে। নতুন layout/component design-এর জন্য code পরিবর্তন লাগবে; এটি drag-and-drop page builder নয়।

## Verification — 2026-10-06

Live owner login, dashboard, pages, media ও settings API পরীক্ষা করা হয়েছে। পরীক্ষার session logout করা হয়েছে। Dashboard: 86 posts, 109 pages, 104 drafts, 91 published entries, 36 media assets। Local automated tests: 10/10 passed; production client/server build passed। এই verification-এ live content edit বা publish করা হয়নি।

Source: এই mern directory। পূর্ণ backup-এর জন্য MongoDB data এবং image bytes সংরক্ষণ করুন; JSON content export একা full backup নয়।
