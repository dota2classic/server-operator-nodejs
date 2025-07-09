import * as fs from 'fs';
import { fillAdditionalDataFromLog, parseLog } from './parseLogFile';
import { GameResultsEvent } from '../gateway/events/gs/game-results.event';
import { DotaTeam } from '../gateway/shared-types/dota-team';
import { Dota_GameMode } from '../gateway/shared-types/dota-game-mode';
import { MatchmakingMode } from '../gateway/shared-types/matchmaking-mode';

describe('Log parsing', () => {
  it('should parse 1x1 log file', async () => {
    const f = await fs.promises
      .readFile('test/1x1.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // Then
    expect(parsed.tower_damage).toEqual([62, 0]);
  });

  it('should parse 5x5 log file', async () => {
    const f = await fs.promises
      .readFile('test/5x5.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // Then
    expect(parsed.tower_damage).toHaveLength(10);
    expect(parsed.hero_damage).toHaveLength(10);
    expect(parsed.level).toHaveLength(10);
  });

  it('should parse 4x5 not full log file', async () => {
    const f = await fs.promises
      .readFile('test/4x5.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // Then
    expect(parsed.tower_damage).toHaveLength(10);
    expect(parsed.hero_damage).toHaveLength(10);
    expect(parsed.level).toHaveLength(9);
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
          hero: 'npc_dota_hero_pudge',
          partyIndex: 0,
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
          hero: 'npc_dota_hero_pudge',
          partyIndex: 0,
        },
      ],
    };
    await fillAdditionalDataFromLog(evt, 'test/1x1.log');
    expect(evt.players[0].towerDamage).toEqual(62);
    expect(evt.players[0].gpm).toEqual(310);
  });
});
