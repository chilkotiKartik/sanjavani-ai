import { describe, expect, it } from 'vitest';
import { GURUGRAM_FACILITIES } from '../src/data/gurugram';
import { findOfflineFacilities } from '../src/offline';

/**
 * Offline hospital ranking.
 *
 * The property that matters is not "it returns something" — it is that the offline
 * answer is the *same* answer. A second ranking implementation that happened to be
 * reachable without a network would be an untested triage system wearing the tested
 * one's clothes, and the first time it disagreed would be in someone's emergency.
 */

/** Cyber City, Gurugram — inside the curated region. */
const IN_REGION = { lat: 28.4952, lng: 77.0888, origin: 'device' as const };
/** Central Kolkata — far outside it. */
const OUT_OF_REGION = { lat: 22.5726, lng: 88.3639, origin: 'device' as const };

describe('finding a hospital with no network', () => {
  it('ranks the bundled directory around a point in region', () => {
    const { facilities, verifiedOn } = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'hospital',
      specialty: 'general_medicine',
      urgency: 'routine',
    });
    expect(facilities.length).toBeGreaterThan(0);
    expect(verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Ranked, not merely listed.
    for (let i = 1; i < facilities.length; i += 1) {
      expect(facilities[i - 1]!.score).toBeGreaterThanOrEqual(facilities[i]!.score);
    }
  });

  it('returns nothing rather than guessing outside the curated region', () => {
    const { facilities, verifiedOn } = findOfflineFacilities({
      origin: OUT_OF_REGION,
      facilityType: 'hospital',
      specialty: 'general_medicine',
      urgency: 'routine',
    });
    expect(facilities).toHaveLength(0);
    expect(verifiedOn).toBeNull();
  });

  it('puts a farther hospital that lists the department above a nearer one that does not', () => {
    /*
     * The "never just the nearest" claim, offline.
     *
     * Urology is the clean case in this data: the closest hospital does not list it, and
     * two about a kilometre further do. If distance alone decided, someone needing a
     * urologist would be sent to the building that cannot help them — which is the
     * failure the whole ranking exists to prevent.
     *
     * Deliberately *not* asserted for an emergency, where every hospital in the set is
     * equally capable and distance legitimately decides. A test that demanded the order
     * differ there would be demanding the ranking be wrong.
     */
    const ranked = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'hospital',
      specialty: 'urology',
      urgency: 'routine',
    }).facilities;

    const nearest = [...ranked].sort((a, b) => a.travel.distanceMeters - b.travel.distanceMeters)[0]!;
    expect(nearest.verifiedSpecialties).not.toContain('urology');

    const top = ranked[0]!;
    expect(top.verifiedSpecialties).toContain('urology');
    expect(top.travel.distanceMeters).toBeGreaterThan(nearest.travel.distanceMeters);
    expect(ranked.indexOf(nearest)).toBeGreaterThan(0);
  });

  it('applies the same hard filters an emergency gets online', () => {
    const { facilities } = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'emergency_department',
      specialty: 'emergency_medicine',
      urgency: 'emergency',
    });
    for (const f of facilities) {
      // Never a clinic, and never somewhere known to be closed without 24×7 emergency.
      expect(f.types.some((t) => t === 'hospital' || t === 'emergency_department')).toBe(true);
      expect(f.openNow === false && f.emergency24x7 !== true).toBe(false);
    }
  });

  it('flags travel times as estimates rather than routes', () => {
    const { facilities } = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'hospital',
      specialty: 'general_medicine',
      urgency: 'urgent',
    });
    for (const f of facilities) {
      expect(f.travel.estimated).toBe(true);
      expect(f.travel.source).toBe('haversine_estimate');
      // Road distance must exceed the crow flies, or the estimate is lying downward.
      expect(f.travel.distanceMeters).toBeGreaterThanOrEqual(f.straightLineMeters);
    }
  });

  it('carries the source and verification date of every entry', () => {
    // "Never invent hospital data" has to survive going offline too.
    const { facilities } = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'hospital',
      specialty: 'general_medicine',
      urgency: 'routine',
    });
    for (const f of facilities) {
      expect(f.source.provider).toBe('curated_directory');
      expect(f.source.url).toMatch(/^https?:\/\//);
      expect(f.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('respects the requested limit', () => {
    const { facilities } = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'hospital',
      specialty: 'general_medicine',
      urgency: 'routine',
      limit: 2,
    });
    expect(facilities.length).toBeLessThanOrEqual(2);
  });

  it('never claims a department the source did not list', () => {
    const cardiology = findOfflineFacilities({
      origin: IN_REGION,
      facilityType: 'hospital',
      specialty: 'cardiology',
      urgency: 'urgent',
    }).facilities;
    const claimed = cardiology.filter((f) => f.verifiedSpecialties.includes('cardiology'));
    for (const f of claimed) {
      const record = GURUGRAM_FACILITIES.find((r) => `cd_${r.slug}` === f.id);
      expect(record?.verifiedSpecialties).toContain('cardiology');
    }
  });
});
