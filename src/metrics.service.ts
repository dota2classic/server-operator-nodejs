import { Injectable, Logger } from '@nestjs/common';
import { RconService } from './rcon.service';
import {
  parseStatsResponse,
  SrcdsServerMetrics,
} from './util/parseStatsResponse';
import { parseStatusResponse } from './util/parseStatusResponse';
import * as client from 'prom-client';
import { Gauge, PrometheusContentType } from 'prom-client';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DockerService } from './docker/docker.service';
import { MatchmakingMode } from './gateway/shared-types/matchmaking-mode';
import { DockerServerWrapper } from './docker/docker-server-wrapper';

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
  private inGauge: Gauge<string>;
  private outGauge: Gauge<string>;

  private pingGauge: Gauge<string>;
  private lossGauge: Gauge<string>;
  private playerCountGauge: Gauge<string>;

  constructor(
    private readonly config: ConfigService,
    private readonly rconService: RconService,
    private readonly pushgateway: client.Pushgateway<PrometheusContentType>,
    private readonly docker: DockerService,
  ) {
    this.cpuGauge = new Gauge<string>({
      name: 'srcds_metrics_cpu',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });

    this.fpsGauge = new Gauge<string>({
      name: 'srcds_metrics_fps',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });

    this.inGauge = new Gauge<string>({
      name: 'srcds_metrics_net_in',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });

    this.outGauge = new Gauge<string>({
      name: 'srcds_metrics_net_out',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });

    this.pingGauge = new Gauge<string>({
      name: 'srcds_metrics_ping',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });

    this.lossGauge = new Gauge<string>({
      name: 'srcds_metrics_loss',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });

    this.playerCountGauge = new Gauge<string>({
      name: 'srcds_player_count',
      help: 'app_concurrent_metrics_help',
      labelNames: ['server_url', 'lobby_type'],
    });
  }

  // every 2 seconds
  @Cron('*/2 * * * * *')
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
      servers.map(async (server) => {
        const metric = await this.collectServerMetrics(
          `match${server.matchId}`,
          27015, // Inner port
        );

        const playerMetric = await this.collectPlayerMetrics(
          `match${server.matchId}`,
          27015, // Inner port
        );
        if (metric) {
          this.saveMetrics(server, metric, playerMetric);
        }
      }),
    );
  }

  private saveMetrics(
    server: DockerServerWrapper,
    metric: SrcdsServerMetrics,
    pm: CleanPlayerMetric[],
  ) {
    this.cpuGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(metric.cpu);

    this.fpsGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(metric.fps);

    this.inGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(metric.in);

    this.outGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(metric.out);

    this.playerCountGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(pm.length);

    this.lossGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(pm.length ? pm.reduce((a, b) => a + b.loss, 0) / pm.length : 0);

    this.pingGauge
      .labels(server.serverUrl, MatchmakingMode[server.lobbyType])
      .set(pm.length ? pm.reduce((a, b) => a + b.ping, 0) / pm.length : 0);
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
