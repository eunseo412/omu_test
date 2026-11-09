import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@omu/core"],
  serverExternalPackages: ["web-push"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [
      {
        // 서비스 워커는 항상 최신 버전을 받도록
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
