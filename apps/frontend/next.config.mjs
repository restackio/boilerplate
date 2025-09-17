import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "shiki"],
  serverExternalPackages: ["@restackio/ai"],
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
}

export default nextConfig
