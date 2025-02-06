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
import { CommandLineConfig } from '../operator/command/launch-game-server.handler';
import { devnullstd } from '../util/devnullstd';

@Injectable()
export class DockerService implements OnApplicationBootstrap {
  private logger = new Logger(DockerService.name);

  constructor(
    @Inject('Docker') private readonly docker: Docker,
    private readonly config: ConfigService,
  ) {}

  //   ENV MAP=dota
  //   ENV TV_ENABLE=1
  //   ENV TICKRATE=30
  // # Default all pick
  //   ENV GAMEMODE=1
  //   ENV LOGFILE_NAME=log.txt
  //   ENV MATCH_BASE64={}
  // docker run --network host -p 27015:27015 -e MATCH_BASE64=aaa dota2classic/srcds:d684

  // TODO:
  public async startGameServer(
    map: Dota_Map,
    clConfig: CommandLineConfig,
    enableTv: boolean,
    gameMode: Dota_GameMode,
    logfileName: string,
    tickrate: number,
    matchId: number,
    exposePort: number,
  ) {
    const matchBase64 = Buffer.from(JSON.stringify(clConfig)).toString(
      'base64',
    );

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
          [DockerServerWrapper.SERVER_URL_LABEL]: `${this.config.get('srcds.host')}:${exposePort}`,
          [DockerServerWrapper.MATCH_ID_LABEL]: matchId.toString(),
        },
        ExposedPorts: {
          [`${exposePort}/tcp`]: {},
          [`${exposePort}/udp`]: {},
          [`${exposePort + 5}/tcp`]: {},
          [`${exposePort + 5}/udp`]: {},
        },

        HostConfig: {
          CpuQuota: 50000,
          Memory: 1024 * 1042 * 512, // 512 m
          AutoRemove: true,
          NetworkMode: runOnHostNetwork ? 'host' : network,

          PortBindings: {
            [`${27015}/tcp`]: [{ HostPort: `${exposePort}` }],
            [`${27015}/udp`]: [{ HostPort: `${exposePort}` }],
            [`${27020}/tcp`]: [{ HostPort: `${exposePort + 5}` }],
            [`${27020}/udp`]: [{ HostPort: `${exposePort + 5}` }],
          },
          Binds: [
            // `${this.getLogsVolumePath()}:/root/dota/logs`,
            // `${this.getReplaysVolumePath()}:/root/dota/replays`,
          ],
        },
        Env: [
          `MATCH_BASE64=${matchBase64}`,
          `MAP=${map}`,
          `TICKRATE=${tickrate}`,
          `LOGFILE_NAME=${logfileName}`,
          `GAMEMODE=${gameMode}`,
          `TV_ENABLE=${enableTv ? 1 : 0}`,
          `RCON_PASSWORD=${this.config.get('srcds.rconPassword')}`,
          `MASTER_SERVER=${runOnHostNetwork ? 'http://localhost:7777' : `http://${masterHost}:7777`}`,
        ],
      },
      (e) => {
        console.log('Callback called!', e);
      },
    );
    this.logger.log('Started game container');
  }

  public async stopGameServer(matchId: number) {
    const some = await this.docker.listContainers();
    const regex = new RegExp(`\/match${matchId}`);
    const container = some.find(
      (t) => t.Names.findIndex((name) => regex.test(name)) !== -1,
    );
  }

  public async getServer(url: string) {
    const r = await this.getRunningGameServers();
  }

  public getLogsVolumePath(): string {
    return path.resolve(this.config.get('srcds.volume'), 'logs');
  }

  async onApplicationBootstrap() {
    await this.updateServerImage();
    await this.createDockerNetwork();
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

  private async updateServerImage() {
    this.logger.log('Pulling latest srcds image...');
    await this.docker.pull(this.config.get('srcds.serverImage'));
    this.logger.log('Successfully updated srcds image');
  }
}
