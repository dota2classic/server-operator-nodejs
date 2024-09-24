import { ServerConfiguration } from "src/app.service";
import { GameResultsEvent } from "src/gateway/events/gs/game-results.event";
import * as path from "path";
import * as fs from "fs";

interface LogData {
    duration: number
    date: number
    num_players: number[]
    steam_id: number[]
    hero_id: number[]
    items: number[]
    gold: number[]
    kills: number[]
    deaths: number[]
    assists: number[]
    leaver_status: number[]
    last_hits: number[]
    denies: number[]
    gold_per_min: number[]
    xp_per_minute: number[]
    gold_spent: number[]
    level: number[]
    hero_damage: number[]
    tower_damage: number[]
    hero_healing: number[]
    time_last_seen: number[]
    support_ability_value: number[]
    party_id: number[]
    scaled_kills: number[]
    scaled_deaths: number[]
    scaled_assists: number[]
    claimed_farm_gold: number[]
    support_gold: number[]
    claimed_denies: number[]
    claimed_misses: number[]
    misses: number[]
    net_worth: number[]
    ability: number[]
    time: number[]
    tower_status: number[]
    barracks_status: number[]
    cluster: number
    first_blood_time: number
    game_balance: number
    server_version: number
    id: number
    average_networth_delta: number
    maximum_losing_networth_lead: number
    average_experience_delta: number
    bonus_gold_winner_total: number
    bonus_gold_loser_total: number
    match_id: number
    region_id: number
    account_id: number
    ip: number
    avg_ping_ms: number
    packet_loss: number
    ping_deviation: number
    full_resends: number
  }
  

export async function fillAdditionalData(evt: GameResultsEvent, server: ServerConfiguration){

    const logFile = path.join(server.path, 'dota/logs', `match_${evt.matchId}.log`);
    const log = await fs.promises.readFile(logFile).then(it => it.toString());
    
    const startSignal = "\nduration"
    let dataStartIndex = log.indexOf(startSignal);
    dataStartIndex = dataStartIndex + 1;

    let dataEndIndex = log.indexOf("\ncluster_id");

    let jsonLikeData = `{ ${log.slice(dataStartIndex, dataEndIndex)} }`;

    const fields = new RegExp(/([0-9a-zA-Z_]+: (\d+))/, 'g');


    const obj = {};
    Array.from(jsonLikeData.matchAll(fields)).forEach(match => {
        const key = match[0].split(": ")[0]
        let value: number | string = Number(match[2]);
        value = Number.isNaN(value) ? match[2] : value;
        const arr = obj[key] || []
        obj[key] = [...arr, value];
    })


    const obj2 = {};
    Object.entries(obj).forEach(([key, value]) => {
        if((value as any[]).length === 1){
            obj2[key] = value[0]
        }else obj2[key]= value;
    });

    const parsedLogFile = obj2 as LogData;


    Object.assign(evt, {
        players: evt.players.map((it, index) => {


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
                netWorth                
            }
        })
    });
}