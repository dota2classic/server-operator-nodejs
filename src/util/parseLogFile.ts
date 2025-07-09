import { GameResultsEvent } from 'src/gateway/events/gs/game-results.event';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';

interface LogData {
  duration: number;
  date: number;
  num_players: number[];
  steam_id: string[];
  hero_id: number[];
  items: number[];
  gold: number[];
  kills: number[];
  deaths: number[];
  assists: number[];
  leaver_status: number[];
  last_hits: number[];
  denies: number[];
  gold_per_min: number[];
  xp_per_minute: number[];
  gold_spent: number[];
  level: number[];
  hero_damage: number[];
  tower_damage: number[];
  hero_healing: number[];
  time_last_seen: number[];
  support_ability_value: number[];
  party_id: number[];
  scaled_kills: number[];
  scaled_deaths: number[];
  scaled_assists: number[];
  claimed_farm_gold: number[];
  support_gold: number[];
  claimed_denies: number[];
  claimed_misses: number[];
  misses: number[];
  net_worth: number[];
  ability: number[];
  time: number[];
  tower_status: number[];
  barracks_status: number[];
  cluster: number;
  first_blood_time: number;
  game_balance: number;
  server_version: number;
  id: number;
  average_networth_delta: number;
  maximum_losing_networth_lead: number;
  average_experience_delta: number;
  bonus_gold_winner_total: number;
  bonus_gold_loser_total: number;
  match_id: number;
  region_id: number;
  account_id: number;
  ip: number;
  avg_ping_ms: number;
  packet_loss: number;
  ping_deviation: number;
  full_resends: number;
}

const numberRegex = /\d+/;
export const parseLog = (rawLog: string): LogData => {
  const regex = new RegExp(/\d\d\/\d\d\/\d\d\d\d - \d\d:\d\d:\d\d: /g);
  const log = rawLog.replaceAll(regex, '');
  const startSignal = 'SIGNOUT: Job created, Protobuf:';

  let dataStartIndex = log.indexOf(startSignal) + startSignal.length;
  dataStartIndex = dataStartIndex + 1;

  let dataEndIndex = log.indexOf('\ncluster_id');

  let jsonLikeData = `{ ${log.slice(dataStartIndex, dataEndIndex)} }`;

  const fields = new RegExp(/([0-9a-zA-Z_]+: (\d+))/, 'g');

  const obj = {};
  Array.from(jsonLikeData.matchAll(fields)).forEach((match) => {
    const key = match[0].split(': ')[0];

    const isNumber = numberRegex.test(match[2]);
    let value: number | string | BigInt;

    if (isNumber && match[2].length > 10) {
      value = BigInt(match[2]);
    } else if (isNumber) {
      value = Number(match[2]);
    } else {
      value = match[2];
    }

    const arr = obj[key] || [];
    obj[key] = [...arr, value];
  });

  const obj2 = {};
  Object.entries(obj).forEach(([key, value]) => {
    if ((value as any[]).length === 1) {
      obj2[key] = value[0];
    } else obj2[key] = value;
  });

  return obj2 as LogData;
};

export async function fillAdditionalDataFromLog(
  evt: GameResultsEvent,
  logFile: string,
) {
  const logger = new Logger('LogParser');
  logger.log(`Beginning parsing log file`, {
    log_file: logFile,
    match_id: evt.matchId,
  });

  const log = await fs.promises.readFile(logFile).then((it) => it.toString());
  const parsedLogFile = parseLog(log);

  Object.assign(evt, {
    players: evt.players.map((it, _index) => {
      // For 4x5 case, we should not trust index

      let index = parsedLogFile.steam_id.findIndex((steam64) => {
        const steam32 = (
          BigInt(steam64.toString()) - BigInt('76561197960265728')
        ).toString();
        return steam32 === it.steam_id;
      });

      if (index === -1) {
        logger.warn("Couldn't find player in match", {
          steam_id: it.steam_id,
          match_id: evt.matchId,
        });
        index = _index;
      }

      const gpm = parsedLogFile.gold_per_min[index];
      const xpm = parsedLogFile.xp_per_minute[index];
      const heroDamage = parsedLogFile.hero_damage[index];
      const heroHealing = parsedLogFile.hero_healing[index];
      const towerDamage = parsedLogFile.tower_damage[index];
      const netWorth = parsedLogFile.net_worth[index];
      return {
        ...it,
        gpm,
        xpm,
        heroDamage,
        heroHealing,
        towerDamage,
        netWorth,
      };
    }),
  });

  logger.log('Log file parsed', { log_file: logFile, match_id: evt.matchId });
}
