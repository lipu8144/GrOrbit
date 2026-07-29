# Deploying GrOrbit

Both configs are included: `vercel.json` (Vercel) and `netlify.toml` (Netlify).
They add SPA rewrites — **required**, or customer QR links like `/r/your-slug`
will 404 on a fresh page load.

## Vercel (recommended, ~5 minutes)
1. Push the project to GitHub (make sure `.env` is NOT committed — see .gitignore).
2. vercel.com → Add New Project → import the repo. Framework auto-detects Vite.
3. Environment Variables → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (the anon key is safe to expose — security lives in RLS)
4. Deploy → you get `https://yourapp.vercel.app` (add a custom domain later).

## Netlify
Same flow at app.netlify.com → Import from Git → set the same env vars.

## After the first deploy — REQUIRED steps
1. **Supabase Auth URLs** (Authentication → URL Configuration):
   - Site URL → your production URL
   - Redirect URLs → add `https://YOURDOMAIN/auth/callback`
   Without this, signup confirmation emails link to localhost.
2. **QR base URL**: dashboard → QR Codes → set "Your website address" to the
   production domain → Save → download & print. Never print localhost QRs.
3. **Smoke test on a real phone (mobile data, not WiFi)**:
   sign up → confirm email → add item → scan printed QR → order →
   kitchen accepts → status updates → complete → feedback → coupon.

## Production checklist
- [ ] Email confirmation ON (Supabase Auth → Providers → Email)
- [ ] All migrations 001–007 applied (`npm run check:supabase` from local)
- [ ] Super-admin promoted (profiles.role = 'superadmin')
- [ ] Old test data cleaned from orders
