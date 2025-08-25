/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "shiki"],
  serverExternalPackages: ["@restackio/ai"],
}

export default nextConfig
