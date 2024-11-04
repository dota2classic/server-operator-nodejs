import { Dota_GameMode } from "src/gateway/shared-types/dota-game-mode";
import { DotaConnectionState } from "src/gateway/shared-types/dota-player-connection-state";
import { DotaTeam } from "src/gateway/shared-types/dota-team";
import { MatchmakingMode } from "src/gateway/shared-types/matchmaking-mode";

export interface LiveMatchDto {
    match_id: number
    matchmaking_mode: MatchmakingMode
    game_mode: Dota_GameMode
    timestamp: number
    duration: number
    server: string;
    heroes: HeroData[]
}

export interface HeroData {
    steam_id: number
    bot: boolean
    pos_x: number
    pos_y: number
    angle: number
    hero: string
    level: number
    health: number
    max_health: number
    mana: number
    max_mana: number
    respawn_time: number
    r_duration: number
    items: string[]
    kills: number
    deaths: number
    assists: number
    team: number
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

export interface MatchFinishedOnSRCDS {
    matchId: number
    winner: DotaTeam
    duration: number
    type: MatchmakingMode
    gameMode: Dota_GameMode
    timestamp: number
    server: string
    players: SRCDSPlayer[]
}

export interface SRCDSPlayer {
    hero: string
    steam_id: number
    team: number
    level: number
    kills: number
    deaths: number
    assists: number
    connection: DotaConnectionState;
    gpm: number
    xpm: number
    last_hits: number
    denies: number
    tower_kills: number
    networth: number;
    roshan_kills: number
    items: string[]
}
