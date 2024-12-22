import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import {
  GSMatchInfo,
  LaunchGameServerCommand,
} from 'src/gateway/commands/LaunchGameServer/launch-game-server.command';
import { spawn } from 'child_process';
import { ServerConfiguration } from 'src/app.service';
import * as path from 'path';
import { isServerRunning } from 'src/util/rcon';
import { LaunchGameServerResponse } from 'src/gateway/commands/LaunchGameServer/launch-game-server.response';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { SrcdsService } from '../../srcds.service';

export interface CommandLineConfig {
  url: string;
  matchId: number;
  info: GSMatchInfo;
}

@CommandHandler(LaunchGameServerCommand)
export class LaunchGameServerCommandHandler
  implements ICommandHandler<LaunchGameServerCommand, LaunchGameServerResponse>
{
  private readonly logger = new Logger(LaunchGameServerCommand.name);

  constructor(
    private readonly srcdsService: SrcdsService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: LaunchGameServerCommand) {
    const server = this.srcdsService.getServer(command.url);
    if (!server) {
      this.logger.verbose('Skipping launch command: not my server', {
        server_url: command.url,
        match_id: command.matchId,
      });
      return undefined;
    }

    if (await isServerRunning(server.url)) {
      this.logger.log('Server is already running', {
        server_url: command.url,
        match_id: command.matchId,
      });
      return new LaunchGameServerResponse(false);
    }

    this.logger.log('Server is free', {
      server_url: command.url,
      match_id: command.matchId,
    });

    return this.runDedicatedServer(server, command.info, command.matchId);
  }

  private getSrcdsExecutable() {
    switch (process.platform) {
      case 'win32':
        return 'srcds.exe';
      default:
        return 'srcds.sh';
    }
  }

  private async runDedicatedWindows(rootPath: string, args: string) {
    const batCmd = `
    pushd ${rootPath}
    start ${this.getSrcdsExecutable()} ${args}
    exit 0
  `;

    const filename = path.join(
      rootPath,
      `${Math.round(Math.random() * 100000)}.bat`,
    );
    await fs.promises.writeFile(filename, batCmd);

    const process = spawn(filename, {
      cwd: rootPath,
      shell: true,
      detached: true,
      stdio: 'ignore',
    });

    await new Promise((resolve) => process.on('exit', resolve));

    await fs.promises.unlink(filename);
  }

  private async runDedicatedLinux(rootPath: string, args: string) {
    const batCmd = `./${this.getSrcdsExecutable()} ${args}`;

    // const filename = path.join(rootPath, `${Math.round(Math.random() * 100000)}.sh`);
    const filename = path.join(rootPath, `tmprun.sh`);
    await fs.promises.writeFile(filename, batCmd);
    await fs.promises.chmod(filename, '755');

    const process = spawn(filename, {
      cwd: rootPath,
      shell: true,
      detached: true,
      stdio: 'inherit',
    });
    process.unref();

    // 2 minutes
    console.log('Unrefed process');

    new Promise((resolve) => process.on('exit', resolve)).then(() => {
      console.log('srcds.sh exited');
    });

    console.log('Awaited process exit, ffs');

    // await fs.promises.unlink(filename);
  }

  private async runDedicatedServer(
    server: ServerConfiguration,
    info: GSMatchInfo,
    matchId: number,
  ) {
    const map = info.map;
    const gameMode = info.gameMode;

    const clConfig: CommandLineConfig = {
      matchId: matchId,
      info: info,
      url: server.url,
    };

    clConfig.info.players.forEach((plr, idx) => {
      // @ts-ignore
      plr['partyId'] = `Party_${idx}`;
    });

    const clConfigBase64 = Buffer.from(JSON.stringify(clConfig)).toString(
      'base64',
    );

    this.logger.log('MatchInfo for base64', clConfig);

    const argArray = [
      '-usercon', // Enable RCON
      '-console', // Enable console
      '-maxplayers',
      '14', // Set max players
      '-game',
      'dota', // Game
      '+rcon_password',
      `${this.config.get('srcds.rconPassword')}`, // RCON password
      '+ip',
      '0.0.0.0', // Host
      '-port',
      `${server.port}`,
      '+map',
      `${map}`, // map
      '+tv_enable',
      '1', // enable tv
      '+tv_port',
      `${server.port + 5}`, // set tv port to server + 5
      '+dota_force_gamemode',
      `${gameMode}`, // What game mode to run
      '-match',
      `${clConfigBase64}`, // Base64 encoded match data
      '+con_logfile',
      `logs/match_${matchId}.log`,
    ];

    this.logger.log('Launch args', {
      launch_arguments: argArray,
      match_id: matchId,
      server: server.url,
    });

    const args = argArray.join(' ');

    if (process.platform === 'win32') {
      await this.runDedicatedWindows(server.path, args);
    } else if (process.platform === 'linux') {
      await this.runDedicatedLinux(server.path, args);
    } else {
      throw new Error('Unsupported platform for dedicated server');
    }

    this.logger.log('Dedicated server started, continuing');

    // Wait here 2 seconds so server is surely started
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return new LaunchGameServerResponse(true);
  }
}
