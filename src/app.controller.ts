import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { LaunchGameServerCommand } from './gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerResponse } from './gateway/commands/LaunchGameServer/launch-game-server.response';
import { construct } from './gateway/util/construct';
import { ServerActualizationRequestedEvent } from './gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from './gateway/events/gs/kill-server-requested.event';
import { FailedPlayerInfo, LiveMatchDto, MatchFailedOnSRCDS, MatchFinishedOnSRCDS, PlayerAbandonOnSRCDS } from './operator/dto';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import { itemIdByName } from './gateway/constants/items';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { fillAdditionalData } from './util/parseLogFile';
import { DotaConnectionState } from './gateway/shared-types/dota-player-connection-state';
import { PlayerId } from './gateway/shared-types/player-id';
import { MatchFailedEvent } from './gateway/events/match-failed.event';
import { GameServerStoppedEvent } from './gateway/events/game-server-stopped.event';
import { ServerStatusEvent } from './gateway/events/gs/server-status.event';
import { PlayerAbandonedEvent } from './gateway/events/bans/player-abandoned.event';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly cbus: CommandBus, private readonly ebus: EventBus) {}

  @MessagePattern(LaunchGameServerCommand.name)
  async LaunchGameServerCommand(
    query: LaunchGameServerCommand,
  ): Promise<LaunchGameServerResponse> {
    return this.cbus.execute(construct(LaunchGameServerCommand, query));
  }

  @MessagePattern(ServerActualizationRequestedEvent.name)
  async ServerActualizationRequestedEvent(
    query: ServerActualizationRequestedEvent,
  ) {
    return this.ebus.publish(construct(ServerActualizationRequestedEvent, query));
  }

  @MessagePattern(KillServerRequestedEvent.name)
  async KillServerRequestedEvent(
    query: KillServerRequestedEvent,
  ) {
    return this.ebus.publish(construct(KillServerRequestedEvent, query));
  }

  @Post('/live_match')
  findAll(@Body() it: LiveMatchDto): string {
    // Propagate 

    
    const mapped: LiveMatchUpdateEvent = {
        matchId: it.match_id,
        server: it.server,
        matchmaking_mode: it.matchmaking_mode,
        game_mode: it.game_mode,
        duration: it.duration,
        timestamp: it.timestamp,
        heroes: it.heroes.map(h => {
          return {
            hero: h.hero,
            team: h.team,
            steam_id: h.steam_id.toString(),
            level: h.level,
  
            bot: h.bot,
            pos_x: h.pos_x,
            pos_y: h.pos_y,
            angle: h.angle,
  
            mana: h.mana,
            max_mana: h.max_mana,
  
            health: h.health,
            max_health: h.max_health,
  
            item0: itemIdByName(h.items[0].replace('item_', '')),
            item1: itemIdByName(h.items[1].replace('item_', '')),
            item2: itemIdByName(h.items[2].replace('item_', '')),
            item3: itemIdByName(h.items[3].replace('item_', '')),
            item4: itemIdByName(h.items[4].replace('item_', '')),
            item5: itemIdByName(h.items[5].replace('item_', '')),
  
            kills: h.kills,
            deaths: h.deaths,
            assists: h.assists,
            respawn_time: h.respawn_time
          }
        })
    }

    this.ebus.publish(construct(LiveMatchUpdateEvent, mapped));
    

    return 'hey'
  }

  @Post('/failed_match')
  async failedMatch(@Body() d: MatchFailedOnSRCDS) {
    const failedPlayers = d.players.filter(t => t.connection === DotaConnectionState.DOTA_CONNECTION_STATE_FAILED)
    if(failedPlayers.length > 0){
      this.ebus.publish(new MatchFailedEvent(d.match_id, d.server, failedPlayers.map(plr => new PlayerId(plr.steam_id.toString()))))
    }
    this.ebus.publish(new ServerStatusEvent(d.server, false, undefined, undefined));
  }


  @Post('/player_abandon')
  async playerAbandon(@Body() d: PlayerAbandonOnSRCDS) {
    await this.ebus.publish(new PlayerAbandonedEvent(new PlayerId(d.steam_id.toString()), d.match_id, d.mode))
  }

  @Post('/match_results')
  async matchResults(@Body() d: MatchFinishedOnSRCDS){
    const g = new GameResultsEvent(
      d.matchId,
      d.winner,
      d.duration,
      d.gameMode,
      d.type,
      d.timestamp,
      d.server,
      d.players.map(p => ({
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
        abandoned: p.connection === DotaConnectionState.DOTA_CONNECTION_STATE_ABANDONED,
        networth: p.networth,

        heroDamage: 0,
        heroHealing: 0,
        towerDamage: 0,

        hero: p.hero
      }))
    );


    console.log("Before waiting 5 seconds")
    // Make sure that log file is fully saved.
    await new Promise((resolve) => setTimeout(resolve, 5000))
    console.log("After waiting 5 seconds")

    try{
      await fillAdditionalData(g, this.appService.config[g.server]);
    }catch(e){
      console.error("Failed to fill additional data from log file, reason:");
      console.error(e);
    }
    
    this.ebus.publish(g)

    return 200;
  }
}
