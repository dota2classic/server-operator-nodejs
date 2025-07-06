import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { LaunchGameServerCommand } from './gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerNewResponse } from './operator/command/launch-game-server-new.response';
import { construct } from './gateway/util/construct';
import { SrcdsServerStartedEvent } from './gateway/events/srcds-server-started.event';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { KillServerRequestedEvent } from './gateway/events/gs/kill-server-requested.event';
import { ServerActualizationRequestedEvent } from './gateway/events/gs/server-actualization-requested.event';
import { RunRconCommand } from './gateway/commands/RunRcon/run-rcon.command';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

@Controller()
export class EventsController {
  private readonly logger = new Logger('EventsController');

  constructor(
    private readonly cbus: CommandBus,
    private readonly ebus: EventBus,
  ) {}

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: LaunchGameServerCommand.name,
    queue: 'operator-queue',
  })
  private async createTicketMessageNotification(data: LaunchGameServerCommand) {
    const result = await this.cbus.execute<
      LaunchGameServerCommand,
      LaunchGameServerNewResponse
    >(construct(LaunchGameServerCommand, data));
    if (!result.server) {
      this.logger.log('Nacked run command for match', {
        match_id: data.matchId,
      });
      return new Nack(true);
    }
    this.logger.log('Acked run command for match', { match_id: data.matchId });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    this.ebus.publish(new SrcdsServerStartedEvent(result.server, data));
    this.logger.log('GameServer started', {
      match_id: data.matchId,
      server_url: result.server,
    });
  }

  @MessagePattern(KillServerRequestedEvent.name)
  async KillServerRequestedEvent(query: KillServerRequestedEvent) {
    return this.ebus.publish(construct(KillServerRequestedEvent, query));
  }

  @MessagePattern(ServerActualizationRequestedEvent.name)
  async ServerActualizationRequestedEvent(
    query: ServerActualizationRequestedEvent,
  ) {
    return this.ebus.publish(
      construct(ServerActualizationRequestedEvent, query),
    );
  }

  @EventPattern(RunRconCommand.name)
  async RunRconCommand(query: RunRconCommand) {
    await this.cbus.execute(construct(RunRconCommand, query));
  }
}
