/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "shiki"],
  serverExternalPackages: ["@restackio/ai"],

  // Optimize for Docker builds
  output: "standalone",

  // Performance optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Skip type checking in Docker builds (do it in CI separately)
  typescript: {
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPE_CHECK === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_SKIP_TYPE_CHECK === "true",
  },

  // Reduce build time
  experimental: {
    // Use worker threads for faster builds
    webpackBuildWorker: true,
    // Optimize package imports
    optimizePackageImports: ["@workspace/ui"],
    // Allow large payloads for Server Actions (e.g. base64 file content)
    // allowedOrigins: when behind Restack proxy, x-forwarded-host (e.g. *.restack.it)
    // can differ from origin (e.g. ai.restack.io); whitelist both so actions are accepted
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: [
        "rehdiqqp.cl921olb.usa.restack.it",
        "ai.restack.io",
        "*.restack.it",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
