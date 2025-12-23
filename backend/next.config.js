/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS configuration for development
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
  // Disable console removal in production
  // Next.js compiler removes console statements by default to reduce bundle size
  // We need to keep them for logging in Vercel Edge Runtime
  compiler: {
    removeConsole: false, // Keep all console statements (log, error, warn, etc.)
  },
}

module.exports = nextConfig
