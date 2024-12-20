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
  private checking: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectS3() private readonly s3: S3,
  ) {}

  // We should be careful not to upload a running replay
  public async uploadReplay(matchId: number | string) {
    const rootFolder = path.join(
      this.configService.get('srcds.dotaRoot'),
      'dota',
      'replays',
    );

    const filename = `${matchId}.dem`;

    this.logger.log(`Uploading replay of match ${matchId}`);
    const file = await fs.promises.readFile(path.join(rootFolder, filename));

    const putObjectCommandInput: PutObjectCommandInput = {
      Bucket: 'replays',
      Key: filename,
      Body: file,
      ContentType: 'application/octet-stream',
      ACL: 'public-read',

      Metadata: {
        originalName: filename,
      },
    };

    const res = await this.s3.putObject(putObjectCommandInput);
    this.logger.log(`Uploaded replay of match ${matchId}`);
    try {
      await fs.promises.unlink(path.join(rootFolder, filename));
      this.logger.log(`Deleted local replay of match ${matchId}`);
    } catch (e) {
      this.logger.error(
        `There was an error deleting replay file ${matchId}.dem`,
      );
    }
  }

  async uploadAllReplays() {
    const rootFolder = path.join(
      this.configService.get('srcds.dotaRoot'),
      'dota',
      'replays',
    );
    const replays = await fs.promises.readdir(rootFolder);
    for (let replay of replays) {
      const [id, ext] = replay.split('.');
      await this.uploadReplay(id);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private async checkUploadableReplays() {
    if (this.checking) {
      this.logger.log('Skipping replay check: another one in progress');
      return;
    }
    try {
      this.checking = true;
      const runningGames = await getRunningSrcds();
      const unsafeMatchIds: number[] = runningGames.map(
        (it) => it.match.matchId,
      );

      this.logger.log(`Running games, cant touch replays`, {
        unsafe_match_ids: unsafeMatchIds,
      });
      const rootFolder = path.join(
        this.configService.get('srcds.dotaRoot'),
        'dota',
        'replays',
      );
      const replays = await fs.promises.readdir(rootFolder);
      for (let replay of replays) {
        const lstat = await fs.promises.lstat(path.join(rootFolder, replay));
        if (lstat.isDirectory()) continue;

        const id = parseInt(replay.split('.')[0]);
        if (unsafeMatchIds.includes(id)) {
          this.logger.verbose(`Skipping upload for match: game in progress`, {
            match_id: id,
          });
          continue; // We can't touch this yet
        }
        await this.uploadReplay(id);
      }
    } catch (e) {
      this.logger.error('There was an error uploading replays:');
      this.logger.error(e);
    } finally {
      this.checking = false;
    }
  }
}
