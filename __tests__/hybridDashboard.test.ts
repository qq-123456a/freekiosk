import { getWebTileAllowedPatterns, isAndroidDashboardTile } from '../src/utils/hybridDashboard';
import type { DashboardTile } from '../src/types/dashboard';

const legacyTile: DashboardTile = { id: '1', label: 'Donation', url: 'https://donations.example.com/dashboard', iconMode: 'letter', order: 0 };

describe('Hybrid Dashboard compatibility and access policy', () => {
  it('keeps legacy dashboard entries as websites', () => {
    expect(isAndroidDashboardTile(legacyTile)).toBe(false);
    expect(getWebTileAllowedPatterns(legacyTile)).toEqual(['https://donations.example.com/*']);
  });

  it('launches only valid Android package tiles', () => {
    expect(isAndroidDashboardTile({ ...legacyTile, kind: 'app', url: '', packageName: 'co.tanda.timeclock' })).toBe(true);
    expect(isAndroidDashboardTile({ ...legacyTile, kind: 'app', url: '', packageName: 'com.bad/other' })).toBe(false);
  });

  it('does not apply webpage filters to native Android apps', () => {
    expect(getWebTileAllowedPatterns({ ...legacyTile, kind: 'app', packageName: 'co.tanda.timeclock' })).toBeNull();
  });

  it('allows only the selected origin and explicitly configured login origin', () => {
    expect(getWebTileAllowedPatterns({
      ...legacyTile, kind: 'web', extraAllowedOrigins: ['https://login.example.com', 'javascript:alert(1)', 'https://login.example.com'],
    })).toEqual(['https://donations.example.com/*', 'https://login.example.com/*']);
  });

  it('honors administrator navigation override', () => {
    expect(getWebTileAllowedPatterns({ ...legacyTile, restrictNavigation: false })).toBeNull();
  });
});
