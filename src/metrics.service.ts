import { Injectable, Logger } from '@nestjs/common';
import { RconService } from './rcon.service';
import { SrcdsService } from './srcds.service';
import { parseStatsResponse, SrcdsServerMetrics } from './util/parseStatsResponse';
import { parseStatusResponse } from './util/parseStatusResponse';
import * as client from 'prom-client';
import { Gauge, PrometheusContentType } from 'prom-client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DockerService } from './docker/docker.service';

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
  private ramGauge: Gauge<string>;
  private playerCountGauge: Gauge<string>;
  private hostCountGauge: Gauge<string>;

  constructor(
    private readonly config: ConfigService,
    private readonly rconService: RconService,
    private readonly srcdsService: SrcdsService,
    private readonly pushgateway: client.Pushgateway<PrometheusContentType>,
    private readonly docker: DockerService,
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

    this.playerCountGauge = new Gauge<string>({
      name: 'host_player_count',
      help: 'app_concurrent_metrics_help',
      labelNames: ['host'],
    });

    this.hostCountGauge = new Gauge<string>({
      name: 'host_game_count',
      help: 'app_concurrent_metrics_help',
      labelNames: ['host'],
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async collectMetrics() {
    await this.collectSrcdsMetrics();

    await this.pushgateway.pushAdd({
      jobName: 'server-operator-nodejs',
    });
  }

  private async collectSrcdsMetrics() {
    const servers = await this.docker.getRunningGameServers();
    // servers.forEach(server => this.collectPlayerMetrics(this.config.get('')))
    const metrics = await Promise.all(
      servers.map((server) =>
        this.collectServerMetrics(
          `match${server.matchId}`,
          27015,, // Inner port
        ),
      ),
    );
    console.log(metrics);
  }

  private async collectServerMetrics(
    host: string,
    port: number,
  ): Promise<SrcdsServerMetrics | undefined> {
    return await this.rconService
      .executeRcon(host, port, 'stats')
      .then(parseStatsResponse)
      .catch((e) => {
        console.error(e);
        return undefined;
      });
  }

  private async collectPlayerMetrics(
    host: string,
    port: number,
  ): Promise<CleanPlayerMetric[]> {
    return await this.rconService
      .executeRcon(host, port, 'status')
      .then(parseStatusResponse)
      .then((entries) =>
        entries.map((raw) => ({
          steam_id: raw.steam_id,
          ping: raw.ping,
          loss: raw.loss,
          rate: raw.rate,
          server: `${host}:${port}`,
        })),
      )
      .catch(() => []);
  }
}
