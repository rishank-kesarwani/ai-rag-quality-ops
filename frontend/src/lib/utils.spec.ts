import { formatPercent, formatScore, getStatusBadgeClass } from './utils';

describe('Frontend Utils', () => {
  it('should format percentage correctly', () => {
    expect(formatPercent(0.854)).toBe('85.4%');
    expect(formatPercent(1.0)).toBe('100.0%');
    expect(formatPercent(null)).toBe('N/A');
    expect(formatPercent(undefined)).toBe('N/A');
  });

  it('should format score correctly', () => {
    expect(formatScore(0.85412)).toBe('0.854');
    expect(formatScore(null)).toBe('N/A');
  });

  it('should return appropriate status badge CSS classes', () => {
    expect(getStatusBadgeClass('PASS')).toContain('emerald');
    expect(getStatusBadgeClass('FAIL')).toContain('rose');
    expect(getStatusBadgeClass('WARN')).toContain('amber');
    expect(getStatusBadgeClass('CONTENT_DRIFT_DETECTED')).toContain('violet');
    expect(getStatusBadgeClass('EMPTY_RETRIEVAL')).toContain('cyan');
  });
});
