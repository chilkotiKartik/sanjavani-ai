import type { ClientLocation, FacilityType, RankedFacility, Specialty, Urgency } from '@sanjeevani/types';
import { GURUGRAM_FACILITIES } from './data/gurugram';
import { directionsUrl } from './directions';
import { haversineMeters } from './geo';
import { curatedToFacility } from './providers/mock/curated-directory';
import { rankFacilities } from './ranking';

/**
 * Finding a hospital with no network.
 *
 * ## Why this exists
 *
 * Triage already runs in the browser when the server is unreachable, which was half a
 * promise: the app would correctly say "go to an emergency department today" and then
 * be unable to name one. The half that was missing is the half someone acts on.
 *
 * So the verified directory is bundled, and the *same* ranking function the server uses
 * scores it here. Not a simplified version and not "nearest first" — the identical
 * weights over relevance, distance, operational status and whether the department is
 * actually listed. An offline answer that ranked differently from an online one would
 * be a second, untested triage system wearing the first one's clothes.
 *
 * ## What is honestly worse offline
 *
 * - **The directory is a snapshot.** It was verified on a date that is recorded against
 *   every entry, and a hospital can close or change between then and now. Callers are
 *   expected to surface the `facilities_offline` degradation so this is never mistaken
 *   for live data.
 * - **No live search.** Only the curated set, which is small and regional. Outside its
 *   region this returns nothing rather than guessing.
 * - **Travel times are estimates**, from straight-line distance and an assumed urban
 *   speed — the same estimate the server falls back to without a routing key, and
 *   flagged the same way.
 *
 * ## What is not worse
 *
 * Eligibility. An emergency still never returns a clinic or a facility known to be
 * closed, because `rankFacilities` applies the same hard filters. The rules that keep
 * someone out of the wrong building do not depend on a network.
 */

/** Road distance is longer than the crow flies; and traffic is not knowable offline. */
const ROAD_FACTOR = 1.35;
const ASSUMED_SPEED_KMH = 22;

/** Beyond this there is no point offering a bundled regional directory. */
const MAX_RADIUS_METERS = 25_000;

export interface OfflineFacilityQuery {
  origin: ClientLocation;
  facilityType: FacilityType;
  specialty: Specialty;
  urgency: Urgency;
  limit?: number;
}

export interface OfflineFacilityResult {
  facilities: RankedFacility[];
  /** When the underlying directory entries were last verified, newest first. */
  verifiedOn: string | null;
}

/**
 * Ranks the bundled directory around a point, entirely locally.
 *
 * Nothing here touches the network or storage, so it is safe to call from a service
 * worker context or a cold offline start.
 */
export function findOfflineFacilities(query: OfflineFacilityQuery): OfflineFacilityResult {
  const origin = { lat: query.origin.lat, lng: query.origin.lng };

  const nearby = GURUGRAM_FACILITIES.map((record) => {
    const facility = curatedToFacility(record);
    return { record, facility, straightLine: haversineMeters(origin, facility.location) };
  }).filter((entry) => entry.straightLine <= MAX_RADIUS_METERS);

  if (nearby.length === 0) return { facilities: [], verifiedOn: null };

  const travel = nearby.map((entry) => {
    const distanceMeters = Math.round(entry.straightLine * ROAD_FACTOR);
    return {
      distanceMeters,
      durationSeconds: Math.round((distanceMeters / 1000 / ASSUMED_SPEED_KMH) * 3600) + 120,
      estimated: true as const,
      source: 'haversine_estimate' as const,
    };
  });

  const ranked = rankFacilities(
    nearby.map((entry) => entry.facility),
    travel,
    nearby.map((entry) => entry.straightLine),
    { facilityType: query.facilityType, specialty: query.specialty, urgency: query.urgency },
    (facility) =>
      directionsUrl({
        destinationName: facility.name,
        destinationAddress: facility.address,
        destinationPlaceId: facility.placeId,
        origin,
      }),
  );

  // The most recent verification date across what is actually being shown, so the UI
  // can say how old this is rather than implying it is current.
  const verifiedOn = nearby
    .map((entry) => entry.record.verifiedOn)
    .sort()
    .at(-1) ?? null;

  return { facilities: ranked.slice(0, query.limit ?? 5), verifiedOn };
}
