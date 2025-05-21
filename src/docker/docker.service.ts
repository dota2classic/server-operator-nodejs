import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import Docker from 'dockerode';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { DockerServerWrapper } from './docker-server-wrapper';
import { Dota_Map } from '../gateway/shared-types/dota-map';
import { Dota_GameMode } from '../gateway/shared-types/dota-game-mode';
import { RunServerSchema } from '../operator/command/launch-game-server.handler';
import { devnullstd } from '../util/devnullstd';
import { DockerContainerMetrics } from '../metric/docker-container.metrics';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';

@Injectable()
export class DockerService implements OnApplicationBootstrap {
  private logger = new Logger(DockerService.name);

  constructor(
    @Inject('Docker') private readonly docker: Docker,
    private readonly config: ConfigService,
  ) {}

  // TODO:
  public async startGameServer(
    map: Dota_Map,
    schema: RunServerSchema,
    enableTv: boolean,
    gameMode: Dota_GameMode,
    logfileName: string,
    tickrate: number,
    matchId: number,
    gamePort: number,
  ) {
    const tvPort = gamePort + 5;

    // Initial setup
    // clConfig.info.players.forEach((plr) => (plr['ignore'] = false));
    // const matchBase64 = Buffer.from(JSON.stringify(clConfig)).toString(
    //   'base64',
    // );
    const matchBase64 = '52';
    const configFilename = await this.createTemporaryLaunchConfig(schema);

    this.logger.log('Starting SRCDS container', {
      matchId: matchId,
    });

    const masterHost = this.config.get('srcds.masterHost');
    const network = this.config.get('srcds.network');
    const runOnHostNetwork = !network;
    this.logger.log(`Running in ${runOnHostNetwork ? 'host' : 'network'} mode`);
    this.docker.run(
      this.config.get('srcds.serverImage'),
      [],
      devnullstd(),
      {
        name: `match${matchId}`,
        AttachStdin: false,
        AttachStderr: false,
        AttachStdout: false,
        OpenStdin: false,
        StdinOnce: false,
        // Volumes: {
        //   "./logs": "./dota/logs"
        // },
        Labels: {
          [DockerServerWrapper.SERVER_URL_LABEL]: `${this.config.get('srcds.host')}:${gamePort}`,
          [DockerServerWrapper.MATCH_ID_LABEL]: matchId.toString(),
          [DockerServerWrapper.LOBBY_TYPE_LABEL]: schema.lobbyType.toString(),
        },
        ExposedPorts: {
          [`${gamePort}/tcp`]: {},
          [`${gamePort}/udp`]: {},
          [`${tvPort}/tcp`]: {},
          [`${tvPort}/udp`]: {},
        },
        Volumes: {
          '/root/dota/logs': {},
          '/root/dota/replays': {},
          // '/root/dota/cfg/match_cfg': {},
        },

        HostConfig: {
          CpuQuota: this.config.get('srcds.cpuQuota'),
          Memory: 1024 * 1042 * this.config.get('srcds.memory'), // 512 m
          AutoRemove: true,
          NetworkMode: runOnHostNetwork ? 'host' : network,

          PortBindings: {
            // [`${27015}/tcp`]: [{ HostPort: `${exposePort}` }],
            // [`${27015}/udp`]: [{ HostPort: `${exposePort}` }],
            // [`${27020}/tcp`]: [{ HostPort: `${exposePort + 5}` }],
            // [`${27020}/udp`]: [{ HostPort: `${exposePort + 5}` }],

            [`${gamePort}/tcp`]: [{ HostPort: `${gamePort}` }],
            [`${gamePort}/udp`]: [{ HostPort: `${gamePort}` }],
            [`${tvPort}/tcp`]: [{ HostPort: `${tvPort}` }],
            [`${tvPort}/udp`]: [{ HostPort: `${tvPort}` }],
          },
          Binds: [
            `${this.config.get('srcds.configVolumeName')}:/root/dota/cfg/match_cfg`,
            `${this.config.get('srcds.logVolumeName')}:/root/dota/logs`,
            `${this.config.get('srcds.replayVolumeName')}:/root/dota/replays`,
            `${this.config.get('srcds.dumpVolumeName')}:/tmp/dumps`,
            // `${configFilename}:/root/dota/cfg/match_info.json`,
          ],
        },
        Env: [
          `GAME_PORT=${gamePort}`,
          `TV_PORT=${tvPort}`,
          `MATCH_ID=${matchId}`,
          `MAP=${map}`,
          `TICKRATE=${tickrate}`,
          `LOGFILE_NAME=${logfileName}`,
          `GAMEMODE=${gameMode}`,
          `TV_ENABLE=${enableTv ? 1 : 0}`,
          `RCON_PASSWORD=${this.config.get('srcds.rconPassword')}`,
          `MASTER_SERVER=${runOnHostNetwork ? 'http://localhost:7777' : `http://${masterHost}:7777`}`,
        ],
      },
      (e, a) => {
        this.logger.log('Container stopped', {
          matchId: matchId,
          serverUrl: schema.serverUrl,
        });
      },
    );
    this.logger.log('Started game container');
  }

  public async containerMetrics(dsw: DockerServerWrapper) {
    const container = await this.docker.getContainer(dsw.container.Id);
    const stats = await container.stats({ stream: false });

    const cpuD =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemcpuD =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;

    const cpus = stats.cpu_stats.online_cpus;

    const cpuUsage = (cpus * cpuD) / systemcpuD;

    const metr: DockerContainerMetrics = {
      cpu_usage: cpuUsage,
      ram_usage: stats.memory_stats.usage / stats.memory_stats.limit,
      throttling:
        stats.cpu_stats.throttling_data.throttled_periods /
        stats.cpu_stats.throttling_data.periods,
    };

    return metr;
  }

  public async stopGameServer(matchId: number) {
    const some = await this.docker.listContainers();
    const regex = new RegExp(`\/match${matchId}`);
    const containerInfo = some.find(
      (t) => t.Names.findIndex((name) => regex.test(name)) !== -1,
    );
    const container = this.docker.getContainer(containerInfo.Id);
    return new Promise((resolve) => container.stop(resolve));
  }

  public getLogsVolumePath(): string {
    return path.resolve(this.config.get('srcds.volume'), 'logs');
  }

  public getConfigsVolumePath(): string {
    return path.resolve(this.config.get('srcds.volume'), 'configs');
  }

  async onApplicationBootstrap() {
    await this.createVolume();
    await this.updateImage(this.config.get('srcds.serverImage'));
    await this.createDockerNetwork();
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async checkForUpdates() {
    this.logger.log('Running scheduled update check');
    // First check for server image
    await this.updateImage(this.config.get('srcds.serverImage'));
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  public async deadContainerWatchdog() {
    const servers = await this.getRunningGameServers();
    for (let server of servers) {
      const container = await this.docker.getContainer(server.container.Id);
      const logs = await container
        .logs({ tail: 100, stdout: true, stderr: true })
        .then((it) => it.toString());

      if (logs.includes('PreMinidumpCallback: updating dump comment')) {
        this.logger.error(
          `DEAD CONTAINER DETECTED: ${server.matchId} host ${server.serverUrl}`,
        );
        await container.stop();
        this.logger.warn('Had to manually kill zombie container', {
          match_id: server.matchId,
        });
      }
    }
  }

  public async haveFreeSlot(): Promise<boolean> {
    return (
      this.config.get('srcds.pool') -
        (await this.getRunningGameServers()).length >
      0
    );
  }

  public async getRunningGameServers(): Promise<DockerServerWrapper[]> {
    return (
      await this.docker.listContainers().then((containers) =>
        containers.filter((cont) => {
          const regex = /\/match\d+/g;

          return regex.test(cont.Names[0]);
        }),
      )
    ).map((container) => new DockerServerWrapper(container));
  }

  private getReplaysVolumePath(): string {
    return path.resolve(this.config.get('srcds.volume'), 'replays');
  }

  private async createVolume() {
    await this.getOrCreateVolume(this.config.get('srcds.logVolumeName'));
    await this.getOrCreateVolume(this.config.get('srcds.replayVolumeName'));
    await this.getOrCreateVolume(this.config.get('srcds.configVolumeName'));
  }

  private async createDockerNetwork() {
    const network = await this.docker
      .listNetworks()
      .then((networks) =>
        networks.find((n) => n.Name === this.config.get('srcds.network')),
      );

    let createNew: boolean = !network;
    if (network && (!network.Attachable || network.Driver !== 'bridge')) {
      // Make sure its good
      const n = await this.docker.getNetwork(network.Id);
      await n.remove();

      createNew = true;
    }

    if (!createNew) return;

    await this.docker.createNetwork({
      Name: this.config.get('srcds.network'),
      Attachable: true,
      Driver: 'bridge',
    });
  }

  private async updateImage(image: string): Promise<boolean> {
    this.logger.log('Pulling latest srcds image...');
    await new Promise<void>(async (resolve, reject) => {
      const stream = await this.docker.pull(image);

      const onFinished = (err: Error | undefined, output: any[]) => {
        this.logger.log('Pulled latest server image');
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };
      const onProgress = (event: any) => {
        this.logger.log('Pull progress', event);
      };

      this.docker.modem.followProgress(stream, onFinished, onProgress);
    });

    this.logger.log('Successfully updated srcds image');
    return true;
  }

  private async getOrCreateVolume(name: string) {
    const v = await this.docker.listVolumes();
    let vol = v.Volumes.find((t) => t.Name === name);
    if (!vol) {
      // Not existing
      await this.docker.createVolume({
        Name: name,
        Driver: 'local',
      });
      this.logger.log('Created new volume');
    }

    this.logger.log('Volume exists.');
  }

  private async createTemporaryLaunchConfig(schema: RunServerSchema) {
    const data = JSON.stringify(schema);
    const filename = path.resolve(
      this.getConfigsVolumePath(),
      `${schema.matchId}.json`,
    );
    console.log('Target filename: ', filename);
    await fs.promises.writeFile(filename, data, { flag: 'wx' });
    return filename;
  }
}
