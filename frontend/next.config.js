/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        // 1. Check if BACKEND_URL is explicitly set (Docker environment)
        // 2. Fallback to Local Windows development port (8001)
        const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';

        console.log('Next.js Rewrites: Forwarding /api/* to', BACKEND_URL);

        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
        ]
    },
}

module.exports = nextConfig
