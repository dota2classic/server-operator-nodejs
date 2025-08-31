import { GameResultsEvent } from 'src/gateway/events/gs/game-results.event';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';

export interface ParsedProtobufMessage {
  duration: number;
  good_guys_win: boolean;
  date: number;
  num_players: number[];
  teams: Team[];
  tower_status: number[];
  barracks_status: number[];
  cluster: number;
  server_addr: string;
  first_blood_time: number;
  game_balance: number;
  automatic_surrender: boolean;
  server_version: number;
  additional_msgs: AdditionalMsgs;
  average_networth_delta: number;
  networth_delta_min10: number;
  networth_delta_min20: number;
  maximum_losing_networth_lead: number;
  average_experience_delta: number;
  experience_delta_min10: number;
  experience_delta_min20: number;
  bonus_gold_winner_min10: number;
  bonus_gold_winner_min20: number;
  bonus_gold_winner_total: number;
  bonus_gold_loser_min10: number;
  bonus_gold_loser_min20: number;
  bonus_gold_loser_total: number;
  match_id: number;
  region_id: number;
  players: PlayerConnectionInfo[];
}

export interface Team {
  players: Player[];
}

export interface Player {
  steam_id: number;
  hero_id: number;
  items: number[];
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  leaver_status: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_minute: number;
  gold_spent: number;
  level: number;
  hero_damage: number;
  tower_damage: number;
  hero_healing: number;
  time_last_seen: number;
  support_ability_value: number;
  party_id: number;
  scaled_kills: number;
  scaled_deaths: number;
  scaled_assists: number;
  claimed_farm_gold: number;
  support_gold: number;
  claimed_denies: number;
  claimed_misses: number;
  misses: number;
  ability_upgrades: AbilityUpgrade[];
  net_worth: number;
  additional_units_inventory?: AdditionalUnitsInventory;
}

export interface AbilityUpgrade {
  ability: number;
  time: number;
}

export interface AdditionalUnitsInventory {
  unit_name: string[];
  items: number[];
}

export interface AdditionalMsgs {
  id: number[];
  contents: string[];
}

export interface PlayerConnectionInfo {
  account_id: number;
  ip: number;
  avg_ping_ms: number;
  packet_loss: number;
  ping_deviation: number;
  full_resends: number;
}

type Token = string;

interface ParsedObject {
  [key: string]: any;
}

function collapseRepeated(result: ParsedObject, noCollapseKeys: string[]) {
  for (const key in result) {
    if (Array.isArray(result[key])) {
      Object.values(result[key]).forEach((value: ParsedObject) =>
        collapseRepeated(value, noCollapseKeys),
      );
      if (result[key].length === 1 && !noCollapseKeys.includes(key)) {
        result[key] = result[key][0];
      }
    } else if (typeof result[key] === 'object') {
      collapseRepeated(result[key], noCollapseKeys);
    }
  }
}

export function parseLog(input: string): ParsedProtobufMessage {
  const regex = new RegExp(/\d\d\/\d\d\/\d\d\d\d - \d\d:\d\d:\d\d: /g);
  const log = input.replaceAll(regex, '');
  const startSignal = 'SIGNOUT: Job created, Protobuf:';

  let dataStartIndex = log.indexOf(startSignal) + startSignal.length;
  dataStartIndex = dataStartIndex + 1;

  const dataEndIndex = log.indexOf('\ncluster_id');

  const rawData = log.slice(dataStartIndex, dataEndIndex);

  // Remove comments
  const cleanedInput = rawData.replace(/#.*$/gm, '').trim();

  // Tokenize input
  const tokens: Token[] = tokenize(cleanedInput);

  // Parse tokens starting from index 0
  const [result, _] = parseObject(tokens, 0);

  // Convert arrays with single element to single value
  collapseRepeated(result, [
    'players',
    'teams',
    'items',
    'tower_status',
    'barracks_status',
    'ability_upgrades',
  ]);

  return result as ParsedProtobufMessage;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const regex = /(\{|\}|:)|([^\s\{\}\:]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match[1]) {
      tokens.push(match[1]);
    } else if (match[2]) {
      tokens.push(match[2]);
    }
  }

  return tokens;
}

function parseObject(
  tokens: Token[],
  startIndex: number,
): [ParsedObject, number] {
  const obj: ParsedObject = {};
  let i = startIndex;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === '}') {
      return [obj, i + 1];
    }

    if (token === '{') {
      // Unexpected '{' without key - skip
      i++;
      continue;
    }

    // Parse key
    const key = token;
    i++;

    if (tokens[i] === ':') {
      // Key-value pair with colon
      i++; // skip colon

      if (tokens[i] === '{') {
        // Nested object
        i++; // skip '{'
        const [nestedObj, nextIndex] = parseObject(tokens, i);
        addToResult(obj, key, nestedObj);
        i = nextIndex;
      } else {
        // Primitive value
        const valueToken = tokens[i];
        const value = parseValue(valueToken);
        addToResult(obj, key, value);
        i++;
      }
    } else if (tokens[i] === '{') {
      // Nested object without colon
      i++; // skip '{'
      const [nestedObj, nextIndex] = parseObject(tokens, i);
      addToResult(obj, key, nestedObj);
      i = nextIndex;
    } else {
      // No colon or brace; treat as primitive
      const valueToken = tokens[i];
      const value = parseValue(valueToken);
      addToResult(obj, key, value);
      i++;
    }
  }

  return [obj, i];
}

// Helper to add values to object with array logic
function addToResult(obj: ParsedObject, key: string, value: any) {
  if (!(key in obj)) {
    obj[key] = [];
  }
  obj[key].push(value);
}

// Helper to parse primitive values
export function parseValue(token: string): any {
  // Remove surrounding quotes if present
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    return token.slice(1, -1);
  }

  // Match decimal numbers, including optional sign, decimal point, and scientific notation
  const numberRegex = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

  if (numberRegex.test(token)) {
    // Remove sign for length check
    const absToken = token.replace(/^[-+]/, '');

    // Extract the integer part (digits before decimal point)
    const integerPartMatch = absToken.match(/^\d+/);
    const integerPart = integerPartMatch ? integerPartMatch[0] : '';

    // Check for scientific notation
    const exponentMatch = absToken.match(/[eE][+-]?\d+$/);
    const exponentPart = exponentMatch ? exponentMatch[0] : '';

    // Determine total digits in integer part
    const integerDigitsCount = integerPart.length;

    const BIG_NUMBER_THRESHOLD = 15;

    if (integerDigitsCount > BIG_NUMBER_THRESHOLD) {
      // Too big to safely convert to number, return as string
      return token;
    } else {
      // Safe to parse as float
      return parseFloat(token);
    }
  }

  if (/^(true|false)$/i.test(token)) return token.toLowerCase() === 'true';

  return token;
}

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

  evt.towerStatus = parsedLogFile.tower_status;
  evt.barracksStatus = parsedLogFile.barracks_status;

  parsedLogFile.teams
    .flatMap((t) => t.players)
    .forEach((player) => {
      const steam32 = (
        BigInt(player.steam_id.toString()) - BigInt('76561197960265728')
      ).toString();
      const baseData = evt.players.find((t) => t.steam_id === steam32);
      if (!baseData) {
        logger.warn(
          `Didn't find base player data for steam id ${player.steam_id}!`,
        );
        return;
      }

      baseData.gpm = player.gold_per_min;
      baseData.xpm = player.xp_per_minute;
      baseData.heroDamage = player.hero_damage;
      baseData.heroHealing = player.hero_healing;
      baseData.towerDamage = player.tower_damage;
      baseData.networth = player.net_worth;
      baseData.supportGold = player.support_gold;
      baseData.supportAbilityValue = player.support_ability_value;
      baseData.misses = player.misses;
      baseData.bear = player.additional_units_inventory?.items;
    });

  logger.log('Log file parsed', { log_file: logFile, match_id: evt.matchId });
}
