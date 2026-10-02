import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ...(process.env.API_BASE_URL && { NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL }),
    ...(process.env.SUPABASE_PROJECT_URL && { NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_PROJECT_URL }),
    ...(process.env.SUPABASE_PUBLISHABLE_KEY && { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY }),
  },
};

export default nextConfig;
