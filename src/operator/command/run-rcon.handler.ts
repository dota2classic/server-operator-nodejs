import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { RunRconCommand } from '../../gateway/commands/RunRcon/run-rcon.command';
import { RunRconResponse } from '../../gateway/commands/RunRcon/run-rcon.response';
import { RconService } from '../../rcon.service';
import { SrcdsService } from '../../srcds.service';

@CommandHandler(RunRconCommand)
export class RunRconHandler implements ICommandHandler<RunRconCommand> {
  private readonly logger = new Logger(RunRconHandler.name);

  constructor(
    private readonly rconService: RconService,
    private readonly srcdsService: SrcdsService,
  ) {}

  async execute(command: RunRconCommand): Promise<RunRconResponse> {
    if (!this.srcdsService.getServer(command.serverUrl)) {
      this.logger.warn('Skipping run rcon: not my server', {
        server_url: command.serverUrl,
      });
      return;
    }

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
