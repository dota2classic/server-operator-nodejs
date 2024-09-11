import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { LaunchGameServerCommand } from './gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerResponse } from './gateway/commands/LaunchGameServer/launch-game-server.response';
import { construct } from './gateway/util/construct';
import { ServerActualizationRequestedEvent } from './gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from './gateway/events/gs/kill-server-requested.event';
import { LiveMatchDto, MatchFinishedOnSRCDS } from './operator/dto';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import { itemIdByName } from './gateway/constants/items';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';

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


  @Post('/match_results')
  matchResults(@Body() d: MatchFinishedOnSRCDS){
    console.log(JSON.stringify(d))
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
        abandoned: p.abandon,

        hero: p.hero
      }))
    );
    
    this.ebus.publish(g)

    return 200;
  }
}
