/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        // Dynamic backend URL detection
        // 1. BACKEND_URL env (set in Docker)
        // 2. Default to 8001 for local development (start_all.bat)
        // 3. Fallback to 8000 for standard Docker setups
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
