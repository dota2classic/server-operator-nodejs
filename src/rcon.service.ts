import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rcon } from 'rcon-client';

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
        const rcon = await Rcon.connect({
          host: host,
          port: port,
          password: this.config.get('srcds.rconPassword'),
          timeout,
        });
        const response = await rcon.send(command);
        await rcon.end();
        resolve(response);
      } catch (e) {
        reject(e);
      }
    });
  }
}
