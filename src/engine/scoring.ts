// Hard Module 3: scoring + majority/tie resolution.
// Pure helpers; game.ts applies the awards to player scores and returns followers.

import type { Follower, ScoreEvent } from './types';
import type { CityFeature, MonasteryFeature, RoadFeature } from './features';

export interface MajorityResult {
  scorerIds: string[]; // players tied for the most followers (all score)
  maxCount: number;
}

/** Majority rule: most followers takes all; ties all score. */
export function computeMajority(followers: Follower[]): MajorityResult {
  const counts = new Map<string, number>();
  for (const f of followers) counts.set(f.playerId, (counts.get(f.playerId) ?? 0) + 1);
  let maxCount = 0;
  for (const c of counts.values()) if (c > maxCount) maxCount = c;
  const scorerIds: string[] = [];
  for (const [pid, c] of counts) if (c === maxCount && maxCount > 0) scorerIds.push(pid);
  return { scorerIds, maxCount };
}

export interface ScoreResult {
  event: ScoreEvent;
  /** follower ids to remove from the board and return to supply */
  followerIds: string[];
  /** points awarded per player id */
  awards: Map<string, number>;
}

function buildAwards(scorerIds: string[], points: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of scorerIds) m.set(id, points);
  return m;
}

export function scoreRoad(
  feat: RoadFeature,
  followers: Follower[],
  final: boolean,
): ScoreResult {
  const points = feat.tileCount; // 1 per tile, both during play and final
  const { scorerIds } = computeMajority(followers);
  return {
    event: {
      kind: 'road',
      points,
      scorerIds,
      tileCount: feat.tileCount,
      detail: `Road of ${feat.tileCount} tile${feat.tileCount === 1 ? '' : 's'}`,
      final,
    },
    followerIds: followers.map((f) => f.id),
    awards: buildAwards(scorerIds, points),
  };
}

export function scoreCity(
  feat: CityFeature,
  followers: Follower[],
  final: boolean,
): ScoreResult {
  const perTile = final ? 1 : 2;
  const perPennant = final ? 1 : 2;
  const points = feat.tileCount * perTile + feat.pennants * perPennant;
  const { scorerIds } = computeMajority(followers);
  return {
    event: {
      kind: 'city',
      points,
      scorerIds,
      tileCount: feat.tileCount,
      detail: `City of ${feat.tileCount} tile${feat.tileCount === 1 ? '' : 's'}${
        feat.pennants ? ` + ${feat.pennants} pennant${feat.pennants === 1 ? '' : 's'}` : ''
      }`,
      final,
    },
    followerIds: followers.map((f) => f.id),
    awards: buildAwards(scorerIds, points),
  };
}

export function scoreMonastery(
  feat: MonasteryFeature,
  followers: Follower[],
  final: boolean,
): ScoreResult {
  // During play a completed monastery is 9 (8 neighbours + self).
  // Final: 1 per present tile (surrounding present + the monastery itself).
  const tileCount = final ? feat.surroundingCount + 1 : 9;
  const points = tileCount;
  // A monastery is held by a single monk (no merging), but use majority for uniformity.
  const { scorerIds } = computeMajority(followers);
  return {
    event: {
      kind: 'monastery',
      points,
      scorerIds,
      tileCount,
      detail: final
        ? `Monastery with ${feat.surroundingCount} surrounding tile${
            feat.surroundingCount === 1 ? '' : 's'
          }`
        : `Completed monastery`,
      final,
    },
    followerIds: followers.map((f) => f.id),
    awards: buildAwards(scorerIds, points),
  };
}

/** Field/farmer scoring (end-game only). `completedCityCount` = completed cities the field borders. */
export function scoreField(
  followers: Follower[],
  completedCityCount: number,
): ScoreResult | null {
  if (completedCityCount === 0 || followers.length === 0) return null;
  const points = 3 * completedCityCount;
  const { scorerIds } = computeMajority(followers);
  return {
    event: {
      kind: 'field',
      points,
      scorerIds,
      tileCount: completedCityCount,
      detail: `Field bordering ${completedCityCount} completed cit${
        completedCityCount === 1 ? 'y' : 'ies'
      }`,
      final: true,
    },
    followerIds: followers.map((f) => f.id),
    awards: buildAwards(scorerIds, points),
  };
}
