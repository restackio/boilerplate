/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to look for the app directory in src/
  experimental: {
    appDir: true,
  },
  // This is a component library, not a standalone app
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
}

export default nextConfig
