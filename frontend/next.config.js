/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        // Use environment variable for backend URL, default to localhost for local dev
        const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
        console.log('Using BACKEND_URL for rewrites:', BACKEND_URL);

        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
        ]
    },
}

module.exports = nextConfig
