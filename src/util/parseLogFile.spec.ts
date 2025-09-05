import * as fs from 'fs';
import {
  fillAdditionalDataFromLog,
  parseLog,
  parseValue,
} from './parseLogFile';
import { GameResultsEvent } from '../gateway/events/gs/game-results.event';
import { DotaTeam } from '../gateway/shared-types/dota-team';
import { Dota_GameMode } from '../gateway/shared-types/dota-game-mode';
import { MatchmakingMode } from '../gateway/shared-types/matchmaking-mode';
import { Region } from '../gateway/shared-types/region';
import { DotaPatch } from '../gateway/constants/patch';

describe('Log parsing', () => {
  it('should parse 1x1 log file', async () => {
    const f = await fs.promises
      .readFile('test/1x1.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // Then
    expect(parsed.teams[0].players[0].tower_damage).toEqual(62);
    expect(parsed.teams[1].players[0].tower_damage).toEqual(0);

    expect(parsed.teams[0].players[0].steam_id).toEqual('76561199568305300');
    expect(parsed.teams[1].players[0].steam_id).toEqual('76561199100213123');
  });

  it('should parse 5x5 log file', async () => {
    const f = await fs.promises
      .readFile('test/5x5.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // GPM
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.gold_per_min),
    ).toEqual([223, 432, 170, 374, 473, 359, 615, 278, 426, 592]);

    // XPM
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.xp_per_minute),
    ).toEqual([229, 547, 179, 471, 549, 328, 610, 357, 487, 610]);

    // HeroDamage
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.hero_damage),
    ).toEqual([
      6243, 32146, 4324, 9731, 13355, 21939, 32220, 4320, 11411, 14658,
    ]);

    // TowerDamage
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.tower_damage),
    ).toEqual([376, 0, 103, 242, 1079, 218, 4586, 355, 2240, 2023]);

    // HeroHealing
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.hero_healing),
    ).toEqual([1371, 0, 0, 0, 0, 0, 0, 8377, 1624, 0]);

    // Misses
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.misses),
    ).toEqual([14, 16, 16, 8, 10, 11, 22, 17, 18, 16]);

    // Net worth
    expect(
      parsed.teams.flatMap((t) => t.players).flatMap((t) => t.net_worth),
    ).toEqual([
      4562, 21169, 2409, 16635, 20675, 14937, 31282, 12210, 20559, 26524,
    ]);

    // Then
    expect(parsed.teams[0].players).toHaveLength(5);
    expect(parsed.teams[1].players).toHaveLength(5);
  });

  it('should parse 4x5 not full log file', async () => {
    const f = await fs.promises
      .readFile('test/4x5.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    expect(parsed.tower_status).toEqual([2047, 260]);
    expect(parsed.barracks_status).toEqual([63, 51]);

    // Then
    expect(parsed.teams[0].players).toHaveLength(5);
    expect(parsed.teams[1].players).toHaveLength(5);
  });

  it('should parse lone druid items', async () => {
    const f = await fs.promises
      .readFile('test/druid.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // console.log(parsed)
  });
});

describe('filling additional data', () => {
  it('should fill additional data 1x1', async () => {
    const evt: GameResultsEvent = {
      matchId: 42,
      winner: DotaTeam.RADIANT,
      duration: 420,
      gameMode: Dota_GameMode.ALLPICK,
      type: MatchmakingMode.SOLOMID,
      timestamp: Date.now(),
      server: 'fsdfdsf:4242',
      region: Region.RU_MOSCOW,
      patch: DotaPatch.DOTA_684,
      barracksStatus: [],
      towerStatus: [],
      players: [
        {
          steam_id: '1608039572',
          team: DotaTeam.RADIANT,
          kills: 1,
          deaths: 2,
          assists: 3,
          level: 4,

          item0: 1,
          item1: 0,
          item2: 0,
          item3: 0,
          item4: 0,
          item5: 0,

          gpm: 0,
          xpm: 0,
          last_hits: 0,
          denies: 0,
          networth: 0,
          heroDamage: 0,
          towerDamage: 0,
          heroHealing: 0,
          abandoned: false,
          hero: 'npc_dota_hero_nevermore',
          partyIndex: 0,

          supportAbilityValue: 900,
          supportGold: 75,
          misses: 10,
        },
        {
          steam_id: '1139947395',
          team: DotaTeam.DIRE,
          kills: 1,
          deaths: 2,
          assists: 3,
          level: 4,

          item0: 1,
          item1: 0,
          item2: 0,
          item3: 0,
          item4: 0,
          item5: 0,

          gpm: 0,
          xpm: 0,
          last_hits: 0,
          denies: 0,
          networth: 0,
          heroDamage: 0,
          towerDamage: 0,
          heroHealing: 0,
          abandoned: false,
          hero: 'npc_dota_hero_tinker',
          partyIndex: 0,

          supportAbilityValue: 186,
          supportGold: 0,
          misses: 44,
        },
      ],
    };
    await fillAdditionalDataFromLog(evt, 'test/1x1.log');
    expect(evt.players[0].towerDamage).toEqual(62);
    expect(evt.players[0].gpm).toEqual(310);
    expect(evt.players[0].networth).toEqual(4435);
    expect(evt.players[0].misses).toEqual(10);
    expect(evt.players[1].misses).toEqual(44);
    expect(evt.players[0].bear).toEqual([50, 182, 172, 143, 0, 0]);
    expect(evt.players[1].bear).toBeUndefined();
    expect(evt.towerStatus).toEqual([2047, 2039]);
    expect(evt.barracksStatus).toEqual([63, 63]);
  });
  it('should fill data for bots', async () => {
    const f = await fs.promises
      .readFile('test/bots.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);
  });
});

describe('Value parsing', () => {
  it('should parse big number as string', () => {
    expect(parseValue('76561199568305300')).toEqual('76561199568305300');
    expect(parseValue('1234')).toEqual(1234);
  });
});
