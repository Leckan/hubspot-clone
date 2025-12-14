/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase header size limits to prevent 431 errors
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  // Configure server options
  serverRuntimeConfig: {
    // Increase header size limit
    maxHeaderSize: 16384, // 16KB
  },
  // Add headers configuration
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
