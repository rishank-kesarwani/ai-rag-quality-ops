import { BadRequestException } from '@nestjs/common';
import { URL } from 'url';

export class SsrfValidator {
  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS/GCP/Azure Metadata service
    'metadata.google.internal',
    'instance-data',
  ]);

  /**
   * Validates a URL for SSRF vulnerabilities before any external HTTP request is made.
   * Throws BadRequestException if the URL is unsafe, private, local, or uses a non-HTTP protocol.
   */
  static validateUrl(
    rawUrl: string,
    allowedDomains?: string[],
  ): { valid: boolean; url: URL } {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new BadRequestException(
        'URL is required and must be a valid string',
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      throw new BadRequestException(`Malformed URL format: ${rawUrl}`);
    }

    // 1. Enforce strict HTTP/HTTPS protocol
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        `Forbidden URL protocol "${parsedUrl.protocol}". Only "http:" and "https:" are permitted.`,
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // 2. Block known local and metadata hostnames
    if (this.BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local')) {
      throw new BadRequestException(
        `Access to private/local hostname "${hostname}" is blocked for security.`,
      );
    }

    // 3. Inspect IPv4 private / reserved ranges
    if (this.isPrivateOrReservedIp(hostname)) {
      throw new BadRequestException(
        `Access to private IP address "${hostname}" is blocked (SSRF protection).`,
      );
    }

    // 4. Check domain allowlist if configured
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some((d) => {
        const domainClean = d.trim().toLowerCase();
        return hostname === domainClean || hostname.endsWith(`.${domainClean}`);
      });
      if (!isAllowed) {
        throw new BadRequestException(
          `Domain "${hostname}" is not in the configured external source allowlist.`,
        );
      }
    }

    return { valid: true, url: parsedUrl };
  }

  /**
   * Tests whether an IPv4 address string falls into private or reserved subnets:
   * 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 0.0.0.0/8
   */
  private static isPrivateOrReservedIp(host: string): boolean {
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = host.match(ipv4Regex);
    if (!match) return false;

    const octets = match.slice(1, 5).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return true;

    const [a, b] = octets;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private class A)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private class B: 172.16 - 172.31)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private class C)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local & Cloud Metadata)
    if (a === 169 && b === 254) return true;

    // 0.0.0.0/8
    if (a === 0) return true;

    return false;
  }
}
