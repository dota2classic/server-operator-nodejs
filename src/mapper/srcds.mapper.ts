import { Injectable } from '@nestjs/common';
import { MatchFinishedOnSRCDS } from '../operator/dto';
import { GameResultsEvent } from '../gateway/events/gs/game-results.event';
import { itemIdByName } from '../gateway/constants/items';
import { DotaConnectionState } from '../gateway/shared-types/dota-player-connection-state';

@Injectable()
export class SrcdsMapper {
  public mapResults = (d: MatchFinishedOnSRCDS) => {
    return new GameResultsEvent(
      d.matchId,
      d.winner,
      d.duration,
      d.gameMode,
      d.type,
      d.timestamp,
      d.server,
      d.players.map((p) => {
        console.log(p.items);
        return {
          steam_id: p.steam_id.toString(),
          team: p.team,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          level: p.level,

          item0: itemIdByName(p.items[0]),
          item1: itemIdByName(p.items[1]),
          item2: itemIdByName(p.items[2]),
          item3: itemIdByName(p.items[3]),
          item4: itemIdByName(p.items[4]),
          item5: itemIdByName(p.items[5]),

          gpm: p.gpm,
          xpm: p.gpm,
          last_hits: p.last_hits,
          denies: p.denies,
          abandoned:
            p.connection ===
            DotaConnectionState.DOTA_CONNECTION_STATE_ABANDONED,
          networth: p.networth,

          heroDamage: 0,
          heroHealing: 0,
          towerDamage: 0,

          hero: p.hero,
        };
      }),
    );
  };
}
