# budget-tracker-web

Frontend for the household budget tracker. Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.

## Local development (production-like)

Start the backend first (see `budget-tracker-api` README: `docker compose up -d`, then `SPRING_PROFILES_ACTIVE=local mvn spring-boot:run`). Then:

```bash
cp .env.example .env.local
# In .env.local set NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
# Supabase/Teller values can stay empty until Phases 1-2; the local backend runs without auth.
npm install
npm run dev                  # http://localhost:3000
```

To test against the deployed API instead, point `NEXT_PUBLIC_API_BASE_URL` at the Railway URL (the API's `APP_CORS_ALLOWED_ORIGINS` must include `http://localhost:3000` for that).

## Checks (same as CI)

```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Deployment

Vercel project connected to this GitHub repo. Environment variables from `.env.example` are set in the Vercel dashboard (Preview + Production).

## Notes

- System font stack on purpose: no build-time dependency on Google Fonts.
- Backend lives in `budget-tracker-api`. Auth is Supabase Auth; the backend validates the Supabase JWT.
