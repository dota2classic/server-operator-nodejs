import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { RunRconCommand } from '../../gateway/commands/RunRcon/run-rcon.command';
import { RunRconResponse } from '../../gateway/commands/RunRcon/run-rcon.response';
import { RconService } from '../../rcon.service';
import { DockerService } from '../../docker/docker.service';
import { ConfigService } from '@nestjs/config';

@CommandHandler(RunRconCommand)
export class RunRconHandler implements ICommandHandler<RunRconCommand> {
  private readonly logger = new Logger(RunRconHandler.name);

  constructor(
    private readonly rconService: RconService,
    private readonly docker: DockerService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: RunRconCommand): Promise<RunRconResponse> {
    const host = command.serverUrl.split(':')[0];
    const port = parseInt(command.serverUrl.split(':')[1]);

    const servers = await this.docker.getRunningGameServers();

    const myServer = servers.find((t) => t.serverUrl === command.serverUrl);
    if (!myServer) return;

    this.logger.log('Running RCON command', {
      command: command.command,
      server: command.serverUrl,
    });

    const response: string | undefined = await this.rconService
      .executeRcon(host, port, command.command)
      .catch(() => undefined);

    return new RunRconResponse(response);
  }
}
