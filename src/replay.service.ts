import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectS3, S3 } from 'nestjs-s3';
import * as fs from 'fs';
import * as path from 'path';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getRunningSrcds } from './util/processes';

@Injectable()
export class ReplayService {
  private logger = new Logger(ReplayService.name);

  private procMap = new Map<'logs' | 'replays', boolean>();

  constructor(
    private readonly configService: ConfigService,
    @InjectS3() private readonly s3: S3,
  ) {}

  // We should be careful not to upload a running replay
  public async uploadEntity(
    matchId: number,
    filename: string,
    rootFolder: string,
    targetFilename: string,
    bucket: 'logs' | 'replays',
  ) {
    this.logger.log(`Uploading entity of match ${matchId}`);
    const file = await fs.promises.readFile(path.join(rootFolder, filename));

    const putObjectCommandInput: PutObjectCommandInput = {
      Bucket: bucket,
      Key: targetFilename,
      Body: file,
      ContentType:
        bucket === 'replays' ? 'application/octet-stream' : 'text/plain',
      ACL: bucket === 'replays' ? 'public-read' : 'private',

      Metadata: {
        originalName: targetFilename,
      },
    };

    const res = await this.s3.putObject(putObjectCommandInput);
    this.logger.log(`Uploaded entity of match ${matchId}`, { bucket });
    try {
      await fs.promises.unlink(path.join(rootFolder, filename));
      this.logger.log(`Deleted local entity of match ${matchId}`, { bucket });
    } catch (e) {
      this.logger.error(
        `There was an error deleting entity file ${matchId}.dem`,
        e,
      );
    }
  }

  // async uploadAllReplays() {
  //   const rootFolder = path.join(
  //     this.configService.get('srcds.dotaRoot'),
  //     'dota',
  //     'replays',
  //   );
  //   const replays = await fs.promises.readdir(rootFolder);
  //   for (let replay of replays) {
  //     const [id, ext] = replay.split('.');
  //     await this.uploadReplay(id);
  //   }
  // }

  @Cron(CronExpression.EVERY_MINUTE)
  private async checkUploadableReplays() {
    await this.scanUploadableEntities('replays', 'replays', 10);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private async checkUploadableLogs() {
    await this.scanUploadableEntities('logs', 'logs', 50);
  }

  private async scanUploadableEntities(
    entityFolder: 'logs' | 'replays',
    bucket: 'logs' | 'replays',
    limit: number = 100,
  ) {
    if (this.procMap.get(bucket)) {
      this.logger.log('Skipping entity check: another one in progress', {
        bucket,
      });
      return;
    }
    try {
      this.procMap.set(bucket, true);
      const runningGames = await getRunningSrcds();
      const unsafeMatchIds: number[] = runningGames.map(
        (it) => it.match.matchId,
      );

      this.logger.log(`Running games, cant touch logs`, {
        unsafe_match_ids: unsafeMatchIds,
      });
      if (unsafeMatchIds.length > 0) return;

      const rootFolder = path.join(
        this.configService.get('srcds.dotaRoot'),
        'dota',
        entityFolder,
      );
      const logs = (await fs.promises.readdir(rootFolder)).slice(0, limit); // Let's do 50 at a time
      for (let entity of logs) {
        const lstat = await fs.promises.lstat(path.join(rootFolder, entity));
        if (lstat.isDirectory()) continue;

        const matchId = parseInt(entity.replace(/\D+/g, ''));
        if (Number.isNaN(matchId)) {
          this.logger.warn('NaN match id', { entity });
          continue;
        }

        if (unsafeMatchIds.includes(matchId)) {
          this.logger.verbose(
            `Skipping entity upload for match: game in progress`,
            {
              match_id: matchId,
              bucket,
            },
          );
          continue; // We can't touch this yet
        }
        await this.uploadEntity(
          matchId,
          entity,
          rootFolder,
          bucket === 'logs' ? `${matchId}.log` : `${matchId}.dem`,
          bucket,
        );
      }
    } catch (e) {
      this.logger.error('There was an error uploading entity');
      this.logger.error(e);
    } finally {
      this.procMap.set(bucket, false);
    }
  }
}
