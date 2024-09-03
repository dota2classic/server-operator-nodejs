import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GSMatchInfo, LaunchGameServerCommand } from 'src/gateway/commands/LaunchGameServer/launch-game-server.command';
import { inspect } from 'util';
import { spawn, exec } from "child_process";
import { RCON_PASSWORD } from 'src/env';
import { AppService, ServerConfiguration } from 'src/app.service';
import * as path from "path";
import { MatchmakingMode } from 'src/gateway/shared-types/matchmaking-mode';
import { Dota2Version } from 'src/gateway/shared-types/dota2version';
import { Dota_GameMode } from 'src/gateway/shared-types/dota-game-mode';
import { MatchPlayer } from 'src/gateway/events/room-ready.event';
import { isServerRunning } from 'src/util/rcon';
import { LaunchGameServerResponse } from 'src/gateway/commands/LaunchGameServer/launch-game-server.response';
import { getRunningSrcds } from 'src/util/processes';
import * as fs from "fs";

export interface CommandLineConfig {
  url: string,
  matchId: number,
  info: GSMatchInfo,
}

@CommandHandler(LaunchGameServerCommand)
export class LaunchGameServerCommandHandler
  implements ICommandHandler<LaunchGameServerCommand, LaunchGameServerResponse> {
  private readonly logger = new Logger(LaunchGameServerCommand.name);

  constructor(
    private readonly appService: AppService
  ) {}

  async execute(command: LaunchGameServerCommand) {
    const server = this.appService.config[command.url];
    if(!server){
        console.error("No such server here, skipping");
        return undefined;
    }


    console.log('Do we get stuck here?');
    if(await isServerRunning(server.url)){
      console.log('Server running, cant run it')
      return new LaunchGameServerResponse(false);
    }

    console.log('Server is not running, we can continue')

    
    return this.runDedicatedServer(server, command.info, command.matchId)
  }


  private getSrcdsExecutable(){
    switch(process.platform){
      case 'win32':
        return 'srcds.exe'
      default:
        return 'srcds.sh'
    }
  }

  private getGameMode(mode: MatchmakingMode, version: Dota2Version){
    switch(mode){
      case MatchmakingMode.RANKED:
        return version == Dota2Version.Dota_681 ? Dota_GameMode.ALLPICK : Dota_GameMode.RANKED_AP;
      case MatchmakingMode.UNRANKED:
        return Dota_GameMode.ALLPICK;
      case MatchmakingMode.SOLOMID:
          return Dota_GameMode.SOLOMID;
      case MatchmakingMode.TOURNAMENT_SOLOMID:
        return Dota_GameMode.SOLOMID;
      case MatchmakingMode.DIRETIDE:
          return Dota_GameMode.DIRETIDE;
      case MatchmakingMode.GREEVILING:
        return Dota_GameMode.GREEVILING;
      case MatchmakingMode.ABILITY_DRAFT:
        return Dota_GameMode.ABILITY_DRAFT;
      case MatchmakingMode.TOURNAMENT:
        return Dota_GameMode.CAPTAINS_MODE;
      case MatchmakingMode.CAPTAINS_MODE:
        return Dota_GameMode.CAPTAINS_MODE;
      default:
        return Dota_GameMode.ALLPICK;
    }
  }

  private async runDedicatedServer(server: ServerConfiguration, info: GSMatchInfo, matchId: number){
    
    
    const map = 'dota';
    const gameMode = this.getGameMode(info.mode, info.version);

    const clConfig: CommandLineConfig = {
      matchId: matchId,
      info: info,
      url: server.url
    }

    const clConfigBase64 = btoa(JSON.stringify(clConfig));

    const args = `-usercon -console -maxplayers 14 -game dota +rcon_password ${RCON_PASSWORD()} +ip 0.0.0.0 -port ${server.port} +map ${map} +dota_force_gamemode ${gameMode} -match ${clConfigBase64}`;

    const batCmd = `
      pushd ${server.path}
      start ${this.getSrcdsExecutable()} ${args}
      exit 0
    `;

    const filename = path.join(server.path, `${Math.round(Math.random() * 100000)}.bat`);
    fs.writeFileSync(filename, batCmd);

    
    const process = spawn(filename, {
      cwd: server.path,
      shell: true,
      detached: true,
      stdio: 'ignore'
    });


    await new Promise(resolve => process.on('exit', resolve));
    
    fs.unlinkSync(filename);
  
    return new LaunchGameServerResponse(true);
  }
}