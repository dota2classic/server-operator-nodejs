import { Controller, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { LaunchGameServerCommand } from './gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerNewResponse } from './operator/command/launch-game-server-new.response';
import { construct } from './gateway/util/construct';
import { SrcdsServerStartedEvent } from './gateway/events/srcds-server-started.event';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { KillServerRequestedEvent } from './gateway/events/gs/kill-server-requested.event';
import { ServerActualizationRequestedEvent } from './gateway/events/gs/server-actualization-requested.event';
import { RunRconCommand } from './gateway/commands/RunRcon/run-rcon.command';
import { AmqpConnection, Nack } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { Region } from './gateway/shared-types/region';

@Controller()
export class EventsController implements OnApplicationBootstrap {
  private readonly logger = new Logger('EventsController');

  constructor(
    private readonly cbus: CommandBus,
    private readonly ebus: EventBus,
    private readonly rmq: AmqpConnection,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const region = this.config.get<Region>('srcds.region') || Region.RU_MOSCOW;
    this.logger.log(
      `Binding "${LaunchGameServerCommand.name}.${region}" to "operator-queue.${LaunchGameServerCommand.name}.${region}"`,
    );
    await this.rmq.createSubscriber(
      this.launchGameServer,
      {
        exchange: `app.events`,
        routingKey: `${LaunchGameServerCommand.name}.${region}`,
        queue: `operator-queue.${LaunchGameServerCommand.name}.${region}`,
      },
      'launchGameServer',
    );
  }

  private launchGameServer = async (data: LaunchGameServerCommand) => {
    this.logger.log('Trying to launch game server');
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
    this.logger.log('Acked run command for match', {
      match_id: data.matchId,
      region: data.region,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    this.ebus.publish(new SrcdsServerStartedEvent(data.matchId, result.server));
    this.logger.log('GameServer started', {
      match_id: data.matchId,
      server_url: result.server,
    });
  };

  // Redis
  @MessagePattern(KillServerRequestedEvent.name)
  async KillServerRequestedEvent(query: KillServerRequestedEvent) {
    return this.ebus.publish(construct(KillServerRequestedEvent, query));
  }

  // Redis
  @MessagePattern(ServerActualizationRequestedEvent.name)
  async ServerActualizationRequestedEvent(
    query: ServerActualizationRequestedEvent,
  ) {
    return this.ebus.publish(
      construct(ServerActualizationRequestedEvent, query),
    );
  }

  // Redis
  @EventPattern(RunRconCommand.name)
  async RunRconCommand(query: RunRconCommand) {
    await this.cbus.execute(construct(RunRconCommand, query));
  }
}
