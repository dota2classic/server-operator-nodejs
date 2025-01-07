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
import * as client from 'prom-client';
import { Gauge, PrometheusContentType } from 'prom-client';

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

  private cpuGauge: Gauge<string>;
  private fpsGauge: Gauge<string>;

  constructor(
    private readonly rconService: RconService,
    private readonly srcdsService: SrcdsService,
    private readonly pushgateway: client.Pushgateway<PrometheusContentType>,
  ) {
    this.cpuGauge = new Gauge<string>({
      name: 'srcds_metrics_cpu',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'state'],
    });

    this.fpsGauge = new Gauge<string>({
      name: 'srcds_metrics_fps',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'state'],
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async collectMetrics() {
    for (let server of Array.from(this.srcdsService.pool.values())) {
      try {
        let serverMetrics = await this.collectServerMetrics(server);

        const state = serverMetrics ? 'running' : 'stopped';

        const fps = serverMetrics ? serverMetrics.fps : 0;
        const cpu = serverMetrics ? serverMetrics.cpu : 0;

        this.fpsGauge.labels(server.url, state).set(fps);
        this.cpuGauge.labels(server.url, state).set(cpu);
      } catch (e) {
        this.logger.error('Error while collecting metrics', e);
      }
    }

    await this.pushgateway.pushAdd({
      jobName: 'server-operator-nodejs',
    });
  }

  private async collectServerMetrics(
    server: ServerConfiguration,
  ): Promise<SrcdsServerMetrics | undefined> {
    return await this.rconService
      .executeRcon(server.host, server.port, 'stats')
      .then(parseStatsResponse)
      .catch(() => undefined);
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
