/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
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

  // Turbopack is default in Next.js 16 for dev and build (use --webpack to opt out)
  // Reduce build time & Server Actions (Next 16: serverActions under experimental)
  experimental: {
    optimizePackageImports: ["@workspace/ui"],
    // Allow large payloads for Add files (base64 file content via Server Action)
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
