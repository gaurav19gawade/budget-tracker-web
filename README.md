# budget-tracker-web

Frontend for the household budget tracker. Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.

## Local development

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3000
```

## Checks (same as CI)

```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Deployment

Vercel project connected to this GitHub repo. Environment variables from `.env.example` are set in the Vercel dashboard (Preview + Production).

## Notes

- System font stack on purpose: no build-time dependency on Google Fonts.
- Backend lives in `budget-tracker-api`. Auth is Supabase Auth; the backend validates the Supabase JWT.
