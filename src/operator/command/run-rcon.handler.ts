import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { RunRconCommand } from '../../gateway/commands/RunRcon/run-rcon.command';
import { RunRconResponse } from '../../gateway/commands/RunRcon/run-rcon.response';
import { RconService } from '../../rcon.service';
import { AppService } from '../../app.service';

@CommandHandler(RunRconCommand)
export class RunRconHandler implements ICommandHandler<RunRconCommand> {
  private readonly logger = new Logger(RunRconHandler.name);

  constructor(
    private readonly rconService: RconService,
    private readonly appService: AppService,
  ) {}

  async execute(command: RunRconCommand): Promise<RunRconResponse> {
    const isLocalServer = Object.values(this.appService.config).find(
      (it) => it.url === command.serverUrl,
    );
    if (!isLocalServer) return;
    this.logger.log('Running RCON command', {
      command: command.command,
      server: command.serverUrl,
    });
    const host = command.serverUrl.split(':')[0];
    const port = parseInt(command.serverUrl.split(':')[1]);

    const response: string | undefined = await this.rconService
      .executeRcon(host, port, command.command)
      .catch(() => undefined);

    return new RunRconResponse(response);
  }
}
