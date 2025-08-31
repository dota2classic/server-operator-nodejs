import { Dota_GameMode } from 'src/gateway/shared-types/dota-game-mode';
import { Dota_GameRulesState } from 'src/gateway/shared-types/dota-game-rules-state';
import { DotaConnectionState } from 'src/gateway/shared-types/dota-player-connection-state';
import { DotaTeam } from 'src/gateway/shared-types/dota-team';
import { MatchmakingMode } from 'src/gateway/shared-types/matchmaking-mode';
import { Region } from '../gateway/shared-types/region';
import { DotaPatch } from '../gateway/constants/patch';

export interface LiveMatchDto {
  match_id: number;
  matchmaking_mode: MatchmakingMode;
  game_mode: Dota_GameMode;
  game_state: Dota_GameRulesState;
  timestamp: number;
  duration: number;
  server: string;
  towers: [number, number];
  barracks: [number, number];
  heroes: SlotInfoDto[];
}

export interface HeroData {
  bot: boolean;
  pos_x: number;
  pos_y: number;
  angle: number;
  hero: string;
  level: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  respawn_time: number;
  r_duration: number;
  items: string[];
  kills: number;
  deaths: number;
  assists: number;
}

export class SlotInfoDto {
  team: number;
  steam_id: string;
  connection: DotaConnectionState;
  hero_data: HeroData | undefined;
}

export interface FailedPlayerInfo {
  steam_id: number;
  party_id?: string;
  connection: DotaConnectionState;
}

export interface MatchFailedOnSRCDS {
  players: FailedPlayerInfo[];
  match_id: number;
  server: string;
}

export interface PlayerAbandonOnSRCDS {
  match_id: number;
  steam_id: number;
  abandon_index: number;
  mode: MatchmakingMode;
  server: string;
  game_state: Dota_GameRulesState;
}

export interface PlayerNotLoadedOnSRCDS {
  match_id: number;
  steam_id: number;
  mode: MatchmakingMode;
  server: string;
}

export interface PlayerConnectedOnSRCDS {
  match_id: number;
  steam_id: number;
  lobby_type: MatchmakingMode;
  server: string;
  ip: string;
  gameState: Dota_GameRulesState;
  firstConnect: boolean;
  duration: number;
}

export interface MatchFinishedOnSRCDS {
  matchId: number;
  winner: DotaTeam;
  duration: number;
  type: MatchmakingMode;
  gameMode: Dota_GameMode;
  timestamp: number;
  server: string;
  region: Region;
  patch: DotaPatch;
  players: SRCDSPlayer[];
}

export interface SRCDSPlayer {
  hero: string;
  steam_id: number;
  team: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  connection: DotaConnectionState;
  gpm: number;
  xpm: number;
  last_hits: number;
  denies: number;
  tower_kills: number;
  networth: number;
  roshan_kills: number;
  items: string[];
  party_id: string;
}
