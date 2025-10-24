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
import { Region } from '../../gateway/shared-types/region';

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
  region: Region;
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
      region: command.region,
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

    const isPriorityLobby =
      command.lobbyType == MatchmakingMode.UNRANKED ||
      command.lobbyType === MatchmakingMode.LOBBY;

    const tickrate = isPriorityLobby ? 40 : 30;

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
      isPriorityLobby,
    );

    this.logger.log('Game container started');

    // Wait here 2 seconds so server is surely started
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return new LaunchGameServerNewResponse(serverUrl);
  }
}
