// Test suite to validate Next.js Image Optimization configuration invariants
// Ensures no accidental regression can re-enable wasteful transformation permutations

describe('Image Optimization Configuration', () => {
  const nextConfig = require('../../next.config.js');

  it('enforces single output format WebP to prevent duplicate AVIF+WebP transformations', () => {
    expect(nextConfig.images).toBeDefined();
    expect(nextConfig.images.formats).toEqual(['image/webp']);
  });

  it('configures long cache TTL of at least 30 days for transformed assets', () => {
    expect(nextConfig.images.minimumCacheTTL).toBeGreaterThanOrEqual(2592000);
  });

  it('restricts deviceSizes and imageSizes to avoid excessive dimension variants', () => {
    expect(nextConfig.images.deviceSizes.length).toBeLessThanOrEqual(5);
    expect(nextConfig.images.imageSizes.length).toBeLessThanOrEqual(6);
  });

  it('blocks arbitrary remote image hosts by keeping remotePatterns constrained', () => {
    expect(Array.isArray(nextConfig.images.remotePatterns)).toBe(true);
    expect(nextConfig.images.remotePatterns.length).toBe(0);
  });

  it('safely enables SVG support with sandboxed Content Security Policy', () => {
    expect(nextConfig.images.dangerouslyAllowSVG).toBe(true);
    expect(nextConfig.images.contentSecurityPolicy).toContain("default-src 'self'");
  });
});
