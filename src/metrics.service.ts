import { Injectable, Logger } from '@nestjs/common';
import { RconService } from './rcon.service';
import { SrcdsService } from './srcds.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServerConfiguration } from './app.service';
import {
  parseStatsResponse,
  SrcdsServerMetrics,
} from './util/parseStatsResponse';
import {
  parseStatusResponse,
  SrcdsPlayerMetric,
} from './util/parseStatusResponse';

@Injectable()
export class MetricsService {
  private logger = new Logger('SRCDS');

  constructor(
    private readonly rconService: RconService,
    private readonly srcdsService: SrcdsService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async collectMetrics() {
    for (let server of Array.from(this.srcdsService.pool.values())) {
      let serverMetrics: SrcdsServerMetrics =
        await this.collectServerMetrics(server);
      this.logger.log({
        server: `${server.url}:${server.port}`,
        ...serverMetrics,
      });

      const playerMetrics = await this.collectPlayerMetrics(server);
      playerMetrics.forEach((plr) => {
        this.logger.log({
          server: server.url,
          ...plr,
        });
      });
    }
  }

  private async collectServerMetrics(server: ServerConfiguration) {
    return await this.rconService
      .executeRcon(server.host, server.port, 'stats')
      .then(parseStatsResponse)
      .catch(
        () =>
          ({
            cpu: 0,
            in: 0,
            out: 0,
            uptime: 0,
            fps: 0,
            players: 0,
          }) as SrcdsServerMetrics,
      );
  }

  private async collectPlayerMetrics(
    server: ServerConfiguration,
  ): Promise<SrcdsPlayerMetric[]> {
    return await this.rconService
      .executeRcon(server.host, server.port, 'status')
      .then(parseStatusResponse)
      .catch(() => []);
  }
}
