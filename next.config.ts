import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ...(process.env.API_BASE_URL && { NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL }),
    ...(process.env.SUPABASE_PROJECT_URL && { NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_PROJECT_URL }),
    ...(process.env.SUPABASE_PUBLISHABLE_KEY && { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY }),
    ...(process.env.TELLER_APPLICATION_ID && { NEXT_PUBLIC_TELLER_APPLICATION_ID: process.env.TELLER_APPLICATION_ID }),
    ...(process.env.TELLER_ENV && { NEXT_PUBLIC_TELLER_ENV: process.env.TELLER_ENV }),
  },
};

export default nextConfig;
