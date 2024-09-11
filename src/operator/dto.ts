import { Dota_GameMode } from "src/gateway/shared-types/dota-game-mode";
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