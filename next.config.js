/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/exchange', // Ruta interna que llamará el frontend
        destination: 'https://monedapi.ar/api/usd', // URL externa de la API real
      },
    ];
  },
}

module.exports = nextConfig