
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "shiki"],
  serverExternalPackages: ["@restackio/ai"],

  // Allow large payloads for Add files (base64 file content via Server Action)
  serverActions: {
    bodySizeLimit: '50mb',
  },

  // Optimize for Docker builds
  output: 'standalone',

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Skip type checking in Docker builds (do it in CI separately)
  typescript: {
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPE_CHECK === 'true',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_SKIP_TYPE_CHECK === 'true',
  },

  // Reduce build time
  experimental: {
    // Use worker threads for faster builds
    webpackBuildWorker: true,
    // Optimize package imports
    optimizePackageImports: ['@workspace/ui'],
    // Allow large payloads (fallback for Next.js versions that read from experimental)
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

export default nextConfig
