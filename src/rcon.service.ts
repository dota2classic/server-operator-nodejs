import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { Rcon } from 'rcon-client';
import Rcon from 'rcon-srcds';

@Injectable()
export class RconService {
  constructor(private readonly config: ConfigService) {}

  public async executeRcon(
    host: string,
    port: number,
    command: string,
    timeout: number = 1000,
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeout);

      try {
        const rcon = new Rcon({
          host: host,
          port: port,
          timeout,
        });
        const authenticated = await rcon.authenticate(
          this.config.get('srcds.rconPassword'),
        );
        if (!authenticated) {
          reject(new Error('Wrong rcon password'));
          return;
        }

        const response = await rcon.execute(command);
        await rcon.disconnect();
        resolve(response.toString());
      } catch (e) {
        reject(e);
      }
    });
  }
}
