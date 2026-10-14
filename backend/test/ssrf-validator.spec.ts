import { BadRequestException } from '@nestjs/common';
import { SsrfValidator } from '../src/common/utils/ssrf-validator';

describe('SsrfValidator', () => {
  it('should accept valid public HTTPS URLs', () => {
    const result = SsrfValidator.validateUrl(
      'https://docs.example.com/api/v1/spec.md',
    );
    expect(result.valid).toBe(true);
    expect(result.url.hostname).toBe('docs.example.com');
  });

  it('should reject local hostnames (localhost, 127.0.0.1, 0.0.0.0)', () => {
    expect(() =>
      SsrfValidator.validateUrl('http://localhost:8080/internal'),
    ).toThrow(BadRequestException);
    expect(() =>
      SsrfValidator.validateUrl('http://127.0.0.1:3000/metrics'),
    ).toThrow(BadRequestException);
    expect(() => SsrfValidator.validateUrl('http://0.0.0.0/debug')).toThrow(
      BadRequestException,
    );
  });

  it('should reject cloud metadata service IP (169.254.169.254)', () => {
    expect(() =>
      SsrfValidator.validateUrl(
        'http://169.254.169.254/latest/meta-data/credentials',
      ),
    ).toThrow(BadRequestException);
  });

  it('should reject RFC1918 private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', () => {
    expect(() => SsrfValidator.validateUrl('http://10.0.1.25/admin')).toThrow(
      BadRequestException,
    );
    expect(() =>
      SsrfValidator.validateUrl('http://172.20.0.5:9000/secret'),
    ).toThrow(BadRequestException);
    expect(() =>
      SsrfValidator.validateUrl('http://192.168.1.1/router'),
    ).toThrow(BadRequestException);
  });

  it('should reject non-HTTP/HTTPS protocols (file://, ftp://, gopher://)', () => {
    expect(() => SsrfValidator.validateUrl('file:///etc/passwd')).toThrow(
      BadRequestException,
    );
    expect(() =>
      SsrfValidator.validateUrl('ftp://ftp.example.com/dump.tar'),
    ).toThrow(BadRequestException);
  });

  it('should enforce domain allowlist when provided', () => {
    const allowed = ['docs.example.com', 'api.example.com'];

    expect(
      SsrfValidator.validateUrl('https://docs.example.com/guide.md', allowed)
        .valid,
    ).toBe(true);

    expect(() =>
      SsrfValidator.validateUrl(
        'https://untrusted-external-site.com/doc.md',
        allowed,
      ),
    ).toThrow(BadRequestException);
  });
});
