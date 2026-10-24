import { describeHybridFullscreenStatus, type HybridLockTaskStatus } from '../src/utils/hybridFullscreen';

const ownerReady: HybridLockTaskStatus = {
  roddyIsOwner: true,
  roddyAllowlisted: true,
  targetAllowlisted: true,
  mode: 'locked',
  features: 16, // GLOBAL_ACTIONS only; no SYSTEM_INFO or NOTIFICATIONS
};

describe('Hybrid native fullscreen state', () => {
  it('recognizes parity with the existing Single App Device Owner path', () => {
    expect(describeHybridFullscreenStatus(ownerReady)).toContain('genuine Lock Task');
  });

  it('diagnoses a missing actual policy even when an app is shown in the UI', () => {
    const result = describeHybridFullscreenStatus({
      ...ownerReady,
      roddyIsOwner: false,
      roddyAllowlisted: false,
      mode: 'none',
    });
    expect(result).toContain('FreeKiosk Roddy');
    expect(result).toContain('active Lock Task allowlist');
  });

  it('distinguishes allowlisting from the old Device Owner system-bar settings', () => {
    const result = describeHybridFullscreenStatus({
      ...ownerReady,
      roddyIsOwner: false,
    });
    expect(result).toContain('ORIGINAL FreeKiosk remains Device Owner');
    expect(result).toContain('Show System Info');
  });

  it('recognizes owner-managed system info and notifications flags', () => {
    const result = describeHybridFullscreenStatus({ ...ownerReady, features: 16 | 1 | 2 });
    expect(result).toContain('Turn OFF Show System Info');
  });

  it('does not mistake ordinary screen pinning for fully managed Lock Task', () => {
    expect(describeHybridFullscreenStatus({ ...ownerReady, mode: 'pinned' }))
      .toContain('screen pinning');
  });

  it('handles read failure without making up Device Owner status', () => {
    expect(describeHybridFullscreenStatus(null)).toContain('Unable to read');
  });
});
