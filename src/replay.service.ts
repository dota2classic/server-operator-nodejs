import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectS3, S3 } from 'nestjs-s3';
import * as fs from 'fs';
import * as path from 'path';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { DockerService } from './docker/docker.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { zipBuffer } from './util/zipBuffer';
import { EventBus } from '@nestjs/cqrs';
import { MatchArtifactUploadedEvent } from './gateway/events/match-artifact-uploaded.event';
import { MatchArtifactType } from './gateway/shared-types/match-artifact-type';

@Injectable()
export class ReplayService {
  private logger = new Logger(ReplayService.name);

  private procMap = new Map<'logs' | 'replays', boolean>();

  constructor(
    private readonly configService: ConfigService,
    @InjectS3() private readonly s3: S3,
    private readonly docker: DockerService,
    private readonly ebus: EventBus,
  ) {}

  // We should be careful not to upload a running replay
  public async uploadEntity(
    matchId: number,
    filename: string,
    rootFolder: string,
    targetFilename: string,
    bucket: 'logs' | 'replays',
    compress: boolean,
  ) {
    this.logger.log(`Uploading entity of match ${matchId}`);

    let file = await fs.promises.readFile(path.join(rootFolder, filename));

    if (compress) {
      file = await zipBuffer(file, targetFilename);
      targetFilename = targetFilename + '.zip';
    }

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

    this.ebus.publish(
      new MatchArtifactUploadedEvent(
        matchId,
        this.docker.matchIdToModeMap.get(matchId),
        bucket === 'logs' ? MatchArtifactType.LOG : MatchArtifactType.REPLAY,
        bucket,
        targetFilename,
      ),
    );

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

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async checkUploadableReplays() {
    await this.scanUploadableEntities('replays', 'replays', 10, true);
    await this.scanUploadableEntities('configs', 'logs', 10, false);
    await this.scanUploadableEntities('logs', 'logs', 50, false);
  }

  private async scanUploadableEntities(
    entityFolder: 'logs' | 'replays' | 'configs',
    bucket: 'logs' | 'replays',
    limit: number = 100,
    compress: boolean,
  ) {
    if (this.procMap.get(bucket)) {
      this.logger.log('Skipping entity check: another one in progress', {
        bucket,
      });
      return;
    }
    try {
      this.procMap.set(bucket, true);
      const runningGames = await this.docker.getRunningGameServers();
      const unsafeMatchIds: number[] = runningGames.map((it) => it.matchId);

      this.logger.log(`Running games, cant touch ${entityFolder}`, {
        unsafe_match_ids: unsafeMatchIds,
      });
      // if (unsafeMatchIds.length > 0) return;

      const rootFolder = path.join(
        this.configService.get('srcds.volume'),
        entityFolder,
      );
      const logs = (await fs.promises.readdir(rootFolder)).slice(0, limit); // Let's do 50 at a time

      for (let entity of logs) {
        const filePath = path.join(rootFolder, entity);
        const lstat = await fs.promises.lstat(filePath);
        if (lstat.isDirectory()) continue;

        const matchId = parseInt(entity.replace(/\D+/g, ''));
        this.logger.log('Entity match id:' + matchId + ' / ' + unsafeMatchIds);
        if (Number.isNaN(matchId)) {
          this.logger.warn('NaN match id', { entity });
          continue;
        }

        if (
          unsafeMatchIds.includes(matchId) ||
          this.docker.isFreshServer(matchId)
        ) {
          this.logger.verbose(
            `Skipping entity upload for match: game in progress`,
            {
              match_id: matchId,
              bucket,
            },
          );
          continue; // We can't touch this yet
        }

        if (entityFolder === 'configs') {
          await fs.promises.unlink(filePath);
          this.logger.log('Removed config file ' + filePath);
          continue;
        }

        await this.uploadEntity(
          matchId,
          entity,
          rootFolder,
          bucket === 'logs' ? `${matchId}.log` : `${matchId}.dem`,
          bucket,
          compress,
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
