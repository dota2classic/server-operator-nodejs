import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { LaunchGameServerCommand } from 'src/gateway/commands/LaunchGameServer/launch-game-server.command';
import { ConfigService } from '@nestjs/config';
import { LaunchGameServerNewResponse } from './launch-game-server-new.response';
import { getFreePort } from '../../util/getFreePort';
import { DockerService } from '../../docker/docker.service';
import { DotaTeam } from '../../gateway/shared-types/dota-team';
import { MatchmakingMode } from '../../gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from '../../gateway/shared-types/dota-game-mode';
import { DotaPatch } from '../../gateway/constants/patch';

export interface RunServerSchema {
  matchId: number;
  lobbyType: number;
  gameMode: number;
  roomId: string;
  serverUrl: string;
  fillBots: boolean;
  enableCheats: boolean;
  strictPause: boolean;
  players: Player[];
  patch: DotaPatch;
}

export interface Player {
  steamId: string;
  name: string;
  subscriber: boolean;
  muted: boolean;
  ignore: boolean;
  partyId: string;
  team: DotaTeam;
}

@CommandHandler(LaunchGameServerCommand)
export class LaunchGameServerCommandHandler
  implements
    ICommandHandler<LaunchGameServerCommand, LaunchGameServerNewResponse>
{
  private readonly logger = new Logger(LaunchGameServerCommand.name);

  constructor(
    private readonly config: ConfigService,
    private readonly docker: DockerService,
  ) {}

  async execute(command: LaunchGameServerCommand) {
    const canRunServer = await this.docker.haveFreeSlot();

    if (!canRunServer) {
      this.logger.log('No free server here', {
        match_id: command.matchId,
      });
      return new LaunchGameServerNewResponse(undefined);
    }

    this.logger.log('We can run a server!', {
      match_id: command.matchId,
    });

    return this.runDedicatedServer(command);
  }

  private async runDedicatedServer(command: LaunchGameServerCommand) {
    const { map, gameMode, matchId } = command;

    const freePort = await getFreePort();
    const serverUrl = `${this.config.get('srcds.host')}:${freePort}`;
    // const tickrate = 30;

    const schema: RunServerSchema = {
      matchId: command.matchId,
      lobbyType: command.lobbyType,
      gameMode: command.gameMode,
      roomId: command.roomId,
      serverUrl: serverUrl,
      fillBots: command.fillBots,
      enableCheats: command.enableCheats,
      patch: command.patch,
      strictPause:
        command.lobbyType != MatchmakingMode.LOBBY &&
        command.gameMode !== Dota_GameMode.CAPTAINS_MODE,
      players: command.players.map((player) => ({
        steamId: player.steamId,
        subscriber: player.subscriber,
        name: player.name,
        muted: player.muted,
        ignore: false,
        partyId: player.partyId,
        team: player.team,
      })),
    };

    this.logger.log('MatchInfo for base64', schema);

    const tickrate =
      command.lobbyType == MatchmakingMode.UNRANKED ||
      command.lobbyType === MatchmakingMode.LOBBY
        ? 64
        : 30;

    await this.docker.startGameServer(
      map,
      schema,
      true,
      gameMode,
      `match_${matchId}.log`,
      tickrate,
      // 30,
      matchId,
      freePort,
    );

    this.logger.log('Game container started');

    // const argArray = [
    //   '-usercon', // Enable RCON
    //   '-console', // Enable console
    //   '-maxplayers',
    //   '14', // Set max players
    //   '-game',
    //   'dota', // Game
    //   '+rcon_password',
    //   `${this.config.get('srcds.rconPassword')}`, // RCON password
    //   '+ip',
    //   '0.0.0.0', // Host
    //   '-port',
    //   `${server.port}`,
    //   '+map',
    //   `${map}`, // map
    //   '+tv_enable',
    //   '1', // enable tv
    //   '+tv_port',
    //   `${server.port + 5}`, // set tv port to server + 5
    //   `-tickrate`,
    //   tickrate,
    //   '+dota_force_gamemode',
    //   `${gameMode}`, // What game mode to run
    //   '-match',
    //   `${clConfigBase64}`, // Base64 encoded match data
    //   '+con_logfile',
    //   `logs/match_${matchId}.log`,
    //   '+simple',
    //   (info.mode === MatchmakingMode.BOTS).toString(),
    // ];

    // this.logger.log('Launch args', {
    //   launch_arguments: argArray,
    //   match_id: matchId,
    //   server: server.url,
    // });

    // const args = argArray.join(' ');
    //
    // if (process.platform === 'win32') {
    //   await this.runDedicatedWindows(server.path, args);
    // } else if (process.platform === 'linux') {
    //   await this.runDedicatedLinux(server.path, args);
    // } else {
    //   throw new Error('Unsupported platform for dedicated server');
    // }
    //
    // this.logger.log('Dedicated server started, continuing');

    // Wait here 2 seconds so server is surely started
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return new LaunchGameServerNewResponse(serverUrl);
  }
}
