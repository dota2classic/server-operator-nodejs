import { Inject, Injectable } from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { GameServerDiscoveredEvent } from './gateway/events/game-server-discovered.event';
import * as fs from 'fs';
import * as path from "path";
import { Dota2Version } from './gateway/shared-types/dota2version';
import { ClientProxy } from '@nestjs/microservices';
import { ServerStatusEvent } from './gateway/events/gs/server-status.event';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { MatchFailedEvent } from './gateway/events/match-failed.event';


export interface ServerConfiguration {
  path: string;
  port: number;
  url: string;
  version: Dota2Version;
  down_for: number;
  down_since: number;
}

@Injectable()
export class AppService {
  config: Record<string, ServerConfiguration>;

  constructor(
    private readonly ebus: EventBus,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
  ){
      this.config = JSON.parse(fs.readFileSync("serverlist.json").toString());
  }




  @Cron('*/5 * * * * *')
  handleCron() {
    Object.values(this.config).forEach((configuration) => {
      this.ebus.publish(new GameServerDiscoveredEvent(configuration.url, configuration.version));
    });    
  }


  async onApplicationBootstrap() {
    try {
      await this.redisEventQueue.connect();
    } catch (e) {}

    const publicEvents: any[] = [
      GameServerDiscoveredEvent,
      ServerStatusEvent,
      LiveMatchUpdateEvent,
      MatchFailedEvent,
      GameResultsEvent
    ];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe(t => this.redisEventQueue.emit(t.constructor.name, t));
  }

}
