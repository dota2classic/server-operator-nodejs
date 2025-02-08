import {
  Body,
  Controller,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { construct } from './gateway/util/construct';
import {
  LiveMatchDto,
  MatchFailedOnSRCDS,
  MatchFinishedOnSRCDS,
  PlayerAbandonOnSRCDS,
  PlayerConnectedOnSRCDS,
} from './operator/dto';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import { itemIdByName } from './gateway/constants/items';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { fillAdditionalDataFromLog } from './util/parseLogFile';
import { DotaConnectionState } from './gateway/shared-types/dota-player-connection-state';
import { PlayerId } from './gateway/shared-types/player-id';
import { MatchFailedEvent } from './gateway/events/match-failed.event';
import { ServerStatusEvent } from './gateway/events/gs/server-status.event';
import { PlayerAbandonedEvent } from './gateway/events/bans/player-abandoned.event';
import { PlayerConnectedEvent } from './gateway/events/srcds/player-connected.event';
import { MatchStatusService } from './match-status.service';
import { ReqLoggingInterceptor } from './middleware/req-logging.interceptor';
import * as path from 'path';
import { DockerService } from './docker/docker.service';

@UseInterceptors(ReqLoggingInterceptor)
@Controller()
export class AppController {
  private readonly logger = new Logger('AppController');

  constructor(
    private readonly cbus: CommandBus,
    private readonly ebus: EventBus,
    private readonly matchStatusService: MatchStatusService,
    private readonly docker: DockerService,
  ) {}

  @Post('/live_match')
  findAll(@Body() it: LiveMatchDto): string {
    // Propagate

    const mapped: LiveMatchUpdateEvent = {
      matchId: it.match_id,
      server: it.server,
      matchmaking_mode: it.matchmaking_mode,
      game_mode: it.game_mode,
      game_state: it.game_state,
      duration: it.duration,
      timestamp: it.timestamp,
      heroes: it.heroes.map((h) => {
        return {
          team: h.team,
          steam_id: h.steam_id.toString(),
          connection: h.connection,

          hero_data: h.hero_data && {
            level: h.hero_data.level,
            hero: h.hero_data.hero,

            bot: h.hero_data.bot,
            pos_x: h.hero_data.pos_x,
            pos_y: h.hero_data.pos_y,
            angle: h.hero_data.angle,

            mana: h.hero_data.mana,
            max_mana: h.hero_data.max_mana,

            health: h.hero_data.health,
            max_health: h.hero_data.max_health,

            item0: itemIdByName(h.hero_data.items[0].replace('item_', '')),
            item1: itemIdByName(h.hero_data.items[1].replace('item_', '')),
            item2: itemIdByName(h.hero_data.items[2].replace('item_', '')),
            item3: itemIdByName(h.hero_data.items[3].replace('item_', '')),
            item4: itemIdByName(h.hero_data.items[4].replace('item_', '')),
            item5: itemIdByName(h.hero_data.items[5].replace('item_', '')),

            kills: h.hero_data.kills,
            deaths: h.hero_data.deaths,
            assists: h.hero_data.assists,
            respawn_time: h.hero_data.respawn_time,
          },
        };
      }),
    };

    this.ebus.publish(construct(LiveMatchUpdateEvent, mapped));

    return 'hey';
  }

  @Post('/failed_match')
  async failedMatch(@Body() d: MatchFailedOnSRCDS) {
    this.logger.log('Match failed to start', {
      match_id: d.match_id,
      server: d.server,
      players: d.players,
    });

    const failedPlayers = d.players.filter(
      (t) => t.connection === DotaConnectionState.DOTA_CONNECTION_STATE_FAILED,
    );
    if (failedPlayers.length > 0) {
      this.matchStatusService.matchFailed(
        new MatchFailedEvent(
          d.match_id,
          d.server,
          failedPlayers.map((plr) => new PlayerId(plr.steam_id.toString())),
        ),
      );
    }
    this.ebus.publish(
      new ServerStatusEvent(d.server, false, undefined, undefined),
    );
  }

  @Post('/player_abandon')
  async playerAbandon(@Body() d: PlayerAbandonOnSRCDS) {
    this.logger.log('Player abandoned', {
      match_id: d.match_id,
      steam_id: d.steam_id,
      mode: d.mode,
      server: d.server,
      abandon_index: d.abandon_index,
    });
    this.matchStatusService.playerAbandon(
      new PlayerAbandonedEvent(
        new PlayerId(d.steam_id.toString()),
        d.match_id,
        d.abandon_index,
        d.mode,
      ),
    );
  }

  @Post('/player_connect')
  async playerConnect(@Body() d: PlayerConnectedOnSRCDS) {
    this.logger.log('Player connected', {
      match_id: d.match_id,
      steam_id: d.steam_id,
      server: d.server,
      ip: d.ip,
    });
    await this.ebus.publish(
      new PlayerConnectedEvent(
        new PlayerId(d.steam_id.toString()),
        d.match_id,
        d.server,
        d.ip,
      ),
    );
  }

  @Post('/match_results')
  async matchResults(@Body() d: MatchFinishedOnSRCDS) {
    this.logger.log('MatchResults received', {
      results: d,
      match_id: d.matchId,
    });
    const g = new GameResultsEvent(
      d.matchId,
      d.winner,
      d.duration,
      d.gameMode,
      d.type,
      d.timestamp,
      d.server,
      d.players.map((p) => ({
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
          p.connection === DotaConnectionState.DOTA_CONNECTION_STATE_ABANDONED,
        networth: p.networth,

        heroDamage: 0,
        heroHealing: 0,
        towerDamage: 0,

        hero: p.hero,
      })),
    );

    // Make sure that log file is fully saved.
    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.logger.verbose('Waited 5 seconds before parsing log file', {
      match_id: d.matchId,
    });

    try {
      await fillAdditionalDataFromLog(
        g,
        path.join(this.docker.getLogsVolumePath(), `match_${g.matchId}.log`),
      );
    } catch (e) {
      this.logger.error('Failed to fill data from log file', {
        error: e,
        match_id: d.matchId,
      });
    }

    this.matchStatusService.matchResults(g);

    return 200;
  }
}
