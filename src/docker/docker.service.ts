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
    this.docker.run(
      'dota2classic/srcds:d684',
      [],
      process.stdout,
      {
        name: `match-${matchId}`,
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
        HostConfig: {
          CpuQuota: 20000,
          AutoRemove: true,
          NetworkMode: 'host',
          PortBindings: {
            [`${27015}`]: [{ HostPort: `${exposePort}` }],
          },
          Binds: [
            `${this.getLogsVolumePath()}:/root/dota/logs`,
            `${this.getReplaysVolumePath()}:/root/dota/replays`,
          ],
        },
        Env: [
          `MATCH_BASE64=${matchBase64}`,
          `MAP=${map}`,
          `TICKRATE=${tickrate}`,
          `LOGFILE_NAME=${logfileName}`,
          `GAMEMODE=${gameMode}`,
          `TV_ENABLE=${enableTv ? 1 : 0}`,
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
    const regex = new RegExp(`\/match-${matchId}`);
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
    this.getLogsVolumePath();
    await this.stopGameServer(42);
  }

  public async haveFreeSlot(): Promise<boolean> {
    return (
      this.config.get('srcds.pool') -
        (await this.getRunningGameServers()).length >
      0
    );
  }

  public async getRunningGameServers(): Promise<DockerServerWrapper[]> {
    // const regex = new RegExp(`\/match-\d+`);
    const regex = /\/match-\d+/g;
    return (
      await this.docker
        .listContainers()
        .then((containers) =>
          containers.filter(
            (cont) => cont.Names.findIndex((t) => regex.test(t)) !== -1,
          ),
        )
    ).map((container) => new DockerServerWrapper(container));
  }

  private getReplaysVolumePath(): string {
    return path.resolve(this.config.get('srcds.volume'), 'replays');
  }
}
