import { Injectable, Logger } from '@nestjs/common';
import { RconService } from './rcon.service';
import { SrcdsService } from './srcds.service';
import { ServerConfiguration } from './app.service';
import { parseStatsResponse, SrcdsServerMetrics } from './util/parseStatsResponse';
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
  private pingGauge: Gauge<string>;
  private lossGauge: Gauge<string>;

  constructor(
    private readonly rconService: RconService,
    private readonly srcdsService: SrcdsService,
    private readonly pushgateway: client.Pushgateway<PrometheusContentType>,,
  ) {
    this.cpuGauge = new Gauge<string>({
      name: 'srcds_metrics_cpu',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url'],
    });

    this.fpsGauge = new Gauge<string>({
      name: 'srcds_metrics_fps',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url'],
    });

    this.pingGauge = new Gauge<string>({
      name: 'srcds_metrics_ping',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url'],
    });

    this.lossGauge = new Gauge<string>({
      name: 'srcds_metrics_loss',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url'],
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async collectMetrics() {
    for (let server of Array.from(this.srcdsService.pool.values())) {
      try {
        let serverMetrics = await this.collectServerMetrics(server);

        const desiredFPS = 30;

        const fps = serverMetrics ? serverMetrics.fps : desiredFPS;
        const cpu = serverMetrics ? serverMetrics.cpu : 0;

        this.fpsGauge.labels(server.url).set(desiredFPS - fps);

        this.cpuGauge.labels(server.url).set(cpu);

        //

        const playerMetrics = await this.collectPlayerMetrics(server);

        const avg = playerMetrics.length
          ? playerMetrics.map((t) => t.ping).reduce((a, b) => a + b, 0) /
            playerMetrics.length
          : 0;

        console.log(server.url, avg);

        const loss = playerMetrics.length
          ? playerMetrics.map((t) => t.loss).reduce((a, b) => a + b, 0) /
            playerMetrics.length
          : 0;

        this.pingGauge.labels(server.url).set(avg);
        this.lossGauge.labels(server.url).set(loss);
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
