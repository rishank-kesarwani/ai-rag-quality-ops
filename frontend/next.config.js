/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Restrict output formats to modern WebP (avoiding dual AVIF+WebP duplication)
    formats: ['image/webp'],
    // Lean set of device and image sizes based on actual UI requirements
    deviceSizes: [640, 750, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256],
    // Set 31-day minimum cache TTL (2,678,400 seconds) for stable image transformations
    minimumCacheTTL: 2678400,
    // Explicit remote patterns allowlist (empty because no external image hosts are used)
    remotePatterns: [],
    // Secure handling of SVG assets
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
