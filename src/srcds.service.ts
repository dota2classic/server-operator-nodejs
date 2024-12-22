import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerConfiguration } from './app.service';
import { Dota2Version } from './gateway/shared-types/dota2version';
import { Cron } from '@nestjs/schedule';
import { GameServerDiscoveredEvent } from './gateway/events/game-server-discovered.event';
import { EventBus } from '@nestjs/cqrs';

// Allocate servers according to config
@Injectable()
export class SrcdsService {
  private logger = new Logger(SrcdsService.name);

  public pool = new Map<string, ServerConfiguration>();

  constructor(
    config: ConfigService,
    private readonly ebus: EventBus,
  ) {
    const serverCount = config.get<number>('srcds.pool');
    const rootFolder = config.get<string>('srcds.dotaRoot');
    const host = config.get<string>('srcds.host');

    let initialPort = 27015;
    for (let i = 0; i < serverCount; i++) {
      const port = initialPort + i * 10;
      const url = `${host}:${port}`;

      this.pool.set(url, {
        version: Dota2Version.Dota_684,
        url: url,
        port: port,
        path: rootFolder,
      } satisfies ServerConfiguration);
    }

    this.logger.log(`Initialized ${this.pool.size} servers`);
    this.logger.log(Object.fromEntries(this.pool));
  }

  @Cron('*/5 * * * * *')
  handleCron() {
    Object.values(this.pool).forEach((configuration) => {
      this.ebus.publish(
        new GameServerDiscoveredEvent(configuration.url, configuration.version),
      );
    });
  }

  public getServer(url: string): ServerConfiguration | undefined {
    return this.pool.get(url);
  }
}
