import { Injectable, Logger } from '@nestjs/common';
import { RconService } from './rcon.service';
import { SrcdsService } from './srcds.service';
import { ServerConfiguration } from './app.service';
import {
  parseStatsResponse,
  SrcdsServerMetrics,
} from './util/parseStatsResponse';
import { parseStatusResponse } from './util/parseStatusResponse';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CleanPlayerMetric {
  steam_id: string;
  server: string;
  ping: number;
  loss: number;
  rate: number;
}

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
      try {
        let serverMetrics: SrcdsServerMetrics =
          await this.collectServerMetrics(server);
        this.logger.log({
          server: `${server.url}`,
          ...serverMetrics,
        });

        const playerMetrics = await this.collectPlayerMetrics(server);
        playerMetrics.forEach((plr) => {
          this.logger.log({
            server: server.url,
            ...plr,
          });
        });
      } catch (e) {
        this.logger.error('Error while collecting metrics', e);
      }
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
  ): Promise<CleanPlayerMetric[]> {
    return await this.rconService
      .executeRcon(server.host, server.port, 'status')
      .then(parseStatusResponse)
      .then((entries) =>
        entries.map((raw) => ({
          steam_id: raw.steam_id,
          ping: raw.ping,
          loss: raw.loss,
          rate: raw.rate,
          server: server.url,
        })),
      )
      .catch(() => []);
  }
}
