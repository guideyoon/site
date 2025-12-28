/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable standalone for now to ensure simple next start works with volumes
    // output: 'standalone', 
    async rewrites() {
        // Use backend service name for Docker, localhost for local
        const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';
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
