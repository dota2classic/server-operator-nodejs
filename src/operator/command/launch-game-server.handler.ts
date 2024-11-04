import {CommandHandler, ICommandHandler} from '@nestjs/cqrs';
import {Logger} from '@nestjs/common';
import {GSMatchInfo, LaunchGameServerCommand} from 'src/gateway/commands/LaunchGameServer/launch-game-server.command';
import {inspect} from 'util';
import {spawn, exec} from "child_process";
import {RCON_PASSWORD} from 'src/env';
import {AppService, ServerConfiguration} from 'src/app.service';
import * as path from "path";
import {MatchmakingMode} from 'src/gateway/shared-types/matchmaking-mode';
import {Dota2Version} from 'src/gateway/shared-types/dota2version';
import {Dota_GameMode} from 'src/gateway/shared-types/dota-game-mode';
import {MatchPlayer} from 'src/gateway/events/room-ready.event';
import {isServerRunning} from 'src/util/rcon';
import {LaunchGameServerResponse} from 'src/gateway/commands/LaunchGameServer/launch-game-server.response';
import {getRunningSrcds} from 'src/util/processes';
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
    ) {
    }

    async execute(command: LaunchGameServerCommand) {
        const server = this.appService.config[command.url];
        if (!server) {
            console.error("No such server here, skipping");
            return undefined;
        }


        console.log('Do we get stuck here?');
        if (await isServerRunning(server.url)) {
            console.log('Server running, cant run it')
            return new LaunchGameServerResponse(false);
        }

        console.log('Server is not running, we can continue')


        return this.runDedicatedServer(server, command.info, command.matchId)
    }


    private getSrcdsExecutable() {
        switch (process.platform) {
            case 'win32':
                return 'srcds.exe'
            default:
                return 'srcds.sh'
        }
    }

    private getGameMode(mode: MatchmakingMode, version: Dota2Version) {
        switch (mode) {
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

    private async runDedicatedWindows(rootPath: string, args: string) {
        const batCmd = `
    pushd ${rootPath}
    start ${this.getSrcdsExecutable()} ${args}
    exit 0
  `;

        const filename = path.join(rootPath, `${Math.round(Math.random() * 100000)}.bat`);
        await fs.promises.writeFile(filename, batCmd);


        const process = spawn(filename, {
            cwd: rootPath,
            shell: true,
            detached: true,
            stdio: 'ignore'
        });

        await new Promise(resolve => process.on('exit', resolve));

        await fs.promises.unlink(filename);
    }

    private async runDedicatedLinux(rootPath: string, args: string) {

        const batCmd = `./${this.getSrcdsExecutable()} ${args}`;

        // const filename = path.join(rootPath, `${Math.round(Math.random() * 100000)}.sh`);
        const filename = path.join(rootPath, `tmprun.sh`);
        await fs.promises.writeFile(filename, batCmd);
        await fs.promises.chmod(filename, "755");

        console.log(filename);
        console.log(batCmd);

        const process = spawn(filename, {
            cwd: rootPath,
            shell: true,
            detached: true,
            stdio: 'inherit'
        });
        process.unref();


        // 2 minutes
        console.log("Unrefed process")

        new Promise(resolve => process.on('exit', resolve)).then(() => {
            console.log("srcds.sh exited")
        })


        console.log("Awaited process exit, ffs")

        // await fs.promises.unlink(filename);
    }


    private async runDedicatedServer(server: ServerConfiguration, info: GSMatchInfo, matchId: number) {


        const map = 'dota';
        const gameMode = this.getGameMode(info.mode, info.version);

        const clConfig: CommandLineConfig = {
            matchId: matchId,
            info: info,
            url: server.url
        }

        const clConfigBase64 = Buffer.from(JSON.stringify(clConfig)).toString("base64");

        console.log(JSON.stringify(clConfig));
        console.log(clConfigBase64);

        const argArray = [
            '-usercon', // Enable RCON
            '-console', // Enable console
            '-maxplayers', '14', // Set max players
            '-game', 'dota', // Game
            '+rcon_password', `${RCON_PASSWORD()}`, // RCON password
            '+ip', '0.0.0.0', // Host
            '-port', `${server.port}`,
            '+map', `${map}`, // map
            '+tv_enable', '1', // enable tv
            '+dota_force_gamemode', `${gameMode}`, // What game mode to run
            '-match', `${clConfigBase64}`, // Base64 encoded match data
            '+con_logfile', `logs/match_${matchId}.log`
        ]

        const args = argArray.join(' ');
        
        if (process.platform === 'win32') {
            await this.runDedicatedWindows(server.path, args)
        } else if (process.platform === 'linux') {
            await this.runDedicatedLinux(server.path, args);
        } else {
            throw new Error("Unsupported platform for dedicated server")
        }
        console.log("BEFORE RETURNING TRUE!")

        
        return new LaunchGameServerResponse(true);
    }
}