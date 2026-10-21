import { describe, expect, it } from 'vitest';
import { normalizeBuildIdentity, identityLabel } from '../buildIdentity';
describe('candidate provenance is never substituted for a source commit', () => {
  it('shows Unknown when build identity is unavailable', () => {
    const identity = normalizeBuildIdentity(undefined);
    expect(identity.sourceState).toBe('unknown');
    for (const value of [identity.sourceCommit, identity.verifiedBaseCommit, identity.sourceSnapshotSha256, identity.builtAtUTC]) expect(identityLabel(value)).toBe('Unknown');
  });
  it('rejects malformed identities and timestamps', () => {
    expect(normalizeBuildIdentity({ sourceCommit: 'a'.repeat(40), verifiedBaseCommit: 'HEAD', sourceSnapshotSha256: 'latest', builtAtUTC: '2026-99-99T00:00:00.000Z' })).toEqual(normalizeBuildIdentity(null));
  });
  it('keeps verified base distinct from modified candidate input identity', () => {
    const identity = normalizeBuildIdentity({ sourceCommit: 'a'.repeat(40), verifiedBaseCommit: 'b'.repeat(40), sourceSnapshotSha256: 'c'.repeat(64), builtAtUTC: '2026-10-21T12:34:56.000Z' });
    expect(identity.sourceCommit).toBeNull(); expect(identity.verifiedBaseCommit).toBe('b'.repeat(40)); expect(identity.sourceState).toBe('candidate'); expect(identity.sourceSnapshotSha256).toBe('c'.repeat(64));
  });
});
