import {
  parseStatusResponse,
  parseStatusRow,
  SrcdsPlayerMetric,
} from './parseStatusResponse';

describe('parseStatusResponse', () => {
  it('should parse status row for human', () => {
    const some = parseStatusRow(
      '#  3 2 "Fosoroy через атос" [U:1:126880756] 28:53 87 0 active 80000 123.214.4.218:12345',
    );
    expect(some).toEqual({
      userid: 2,
      name: 'Fosoroy через атос',
      steam_id: `126880756`,
      connected: '28:53',
      ping: 87,
      loss: 0,
      state: `active`,
      rate: 80000,
      adr: `123.214.4.218:12345`,
    });
  });

  it('should parse status row for bot', () => {
    const some = parseStatusRow(`# 9 "Gob Bot" BOT active`);

    expect(some).toEqual(undefined);
  });

  it('should parse bots game', () => {
    const raw = `hostname: Dota 2\nversion : 41/41 0 secure  \nsteamid : [A:1:902557723:39451] (90241434204762139)\nudp/ip  :  0.0.0.0:27015 os(Linux) type(dedicated)\nsourcetv:  port 27020, delay 120.0s\nplayers : 2 humans, 9 bots (15 max) (not hibernating)\nedicts : 1037 used of 2048 max\ngamestate: DOTA_GAMERULES_STATE_GAME_IN_PROGRESS Times: Transition=137.00 Current=1979.92\nLv Name         Player        K/ D/ A/ LH/ DN/ Gold Health    Mana\n19 Unknown      фея те�  9/ 5/ 1/122/  7/  589    0/2259  294/ 702\n12 Unknown      Негрос  1/10/ 4/ 89/  1/  610    0/ 986  436/ 572\n12 Unknown      Edith Bot     2/ 8/ 6/ 15/  8/  644 1005/1005 1069/1069\n11 Unknown      Vivian Bot    2/ 9/ 6/ 58/  4/  456 1138/1138  336/ 351\n11 Unknown      Juan Bot      2/12/ 4/ 20/  1/  609 1518/1518  468/ 468\n17 Unknown      Maurice Bot  11/ 3/12/117/ 40/  920  483/1613  184/ 780\n16 Unknown      Chai Bot     11/ 2/ 8/ 56/  7/ 1297  752/1195  926/ 988\n15 Unknown      Mordecai Bot  7/ 2/13/ 60/ 12/  420 1563/1613 1417/1417\n13 Unknown      Jorge Bot     3/ 5/11/ 28/ 10/  180  929/ 929  806/ 806\n16 Unknown      Lupe Bot      9/ 5/14/ 52/  3/ 1568 1095/1806  119/ 559\n# userid name uniqueid connected ping loss state rate adr\n# 2 \"SourceTV\" BOT active\n# 3 \"Edith Bot\" BOT active\n# 4 \"Vivian Bot\" BOT active\n# 5 \"Juan Bot\" BOT active\n# 6 \"Maurice Bot\" BOT active\n# 7 \"Chai Bot\" BOT active\n# 8 \"Mordecai Bot\" BOT active\n# 9 \"Jorge Bot\" BOT active\n#10 \"Lupe Bot\" BOT active\n# 11 10 \"Негросучка\" [U:1:1037635443] 32:53 71 0 active 80000 123.31.25.81:12345\n# 12 11 \"фея технологий\" [U:1:1175148404] 32:43 93 0 active 80000 123.219.46.14:12345\n#end\nL 01/05/2025 - 22:56:06: rcon from \"123.253.249.142:12345\": command \"status\"\n`;

    expect(parseStatusResponse(raw)).toEqual([
      {
        userid: 10,
        name: 'Негросучка',
        steam_id: `1037635443`,
        connected: '32:53',
        ping: 71,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `123.31.25.81:12345`,
      },
      {
        userid: 11,
        name: 'фея технологий',
        steam_id: `1175148404`,
        connected: '32:43',
        ping: 93,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `123.219.46.14:12345`,
      },
    ]);
  });

  it('should sdfd', () => {
    const raw = `hostname: Dota 2
version : 41/41 0 secure  
steamid : [A:1:2405480470:46530] (90271839781173270)
udp/ip  :  172.18.0.3:25636 os(Linux) type(dedicated)
sourcetv:  port 25641, delay 30.0s
players : 10 humans, 1 bots (15 max) (not hibernating)
edicts : 1090 used of 2048 max
gamestate: DOTA_GAMERULES_STATE_GAME_IN_PROGRESS Times: Transition=291.61 Current=1442.17
# userid name uniqueid connected ping loss state rate adr
# 2 "SourceTV" BOT active
#  3 2 "Scooby-Jew" [U:1:210614214] 23:59 97 0 active 80000 93.100.45.147:55411
#  4 3 "P;QP=QP8P:" [U:1:1264751116] 23:57 100 0 active 80000 77.222.99.86:63925
#  5 4 "PPPP P+PP/" [U:1:188552021] 23:57 133 0 active 80000 188.0.7.14:59958
#  6 5 "ycidb" [U:1:1560764202] 23:57 100 0 active 80000 31.41.15.93:56690
#  7 6 "324" [U:1:372067319] 23:55 166 0 active 80000 185.103.253.26:33354
#  8 7 "Aniirus" [U:1:1078061807] 23:55 137 66 active 80000 176.59.8.184:61167
#  9 8 "P PPPPP"PP  PPPP"P" [U:1:254190013] 23:53 133 0 active 80000 212.15.61.67:62952
# 13 9 "baltasar" [U:1:1881570599] 22:25 100 23 active 80000 95.105.125.163:3231
# 11 10 "bPP8P;P>Q PP>P;P8P4P0b" [U:1:229840067] 23:36 200 0 active 80000 95.159.190.250:50442
# 12 11 "seul" [U:1:148928588] 23:18 100 0 active 80000 188.186.228.16:18638
#end
L 07/28/2025 - 09:34:57: rcon from "89.223.53.11:51481": command "status"
`;

    expect(parseStatusResponse(raw)).toEqual([
      {
        userid: 2,
        name: 'Scooby-Jew',
        steam_id: `210614214`,
        connected: '23:59',
        ping: 97,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `93.100.45.147:55411`,
      },
      {
        userid: 3,
        name: 'P;QP=QP8P:',
        steam_id: `1264751116`,
        connected: '23:57',
        ping: 100,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `77.222.99.86:63925`,
      },
      {
        userid: 4,
        name: 'PPPP P+PP/',
        steam_id: `188552021`,
        connected: '23:57',
        ping: 133,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `188.0.7.14:59958`,
      },
      {
        userid: 5,
        name: 'ycidb',
        steam_id: `1560764202`,
        connected: '23:57',
        ping: 100,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `31.41.15.93:56690`,
      },
      {
        userid: 6,
        name: '324',
        steam_id: `372067319`,
        connected: '23:55',
        ping: 166,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `185.103.253.26:33354`,
      },
      {
        userid: 7,
        name: 'Aniirus',
        steam_id: `1078061807`,
        connected: '23:55',
        ping: 137,
        loss: 66,
        state: `active`,
        rate: 80000,
        adr: `176.59.8.184:61167`,
      },
      {
        userid: 8,
        name: 'P PPPPP"PP  PPPP"P',
        steam_id: `254190013`,
        connected: '23:53',
        ping: 133,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `212.15.61.67:62952`,
      },
      {
        userid: 9,
        name: 'baltasar',
        steam_id: `1881570599`,
        connected: '22:25',
        ping: 100,
        loss: 23,
        state: `active`,
        rate: 80000,
        adr: `95.105.125.163:3231`,
      },
      {
        userid: 10,
        name: 'bPP8P;P>Q PP>P;P8P4P0b',
        steam_id: `229840067`,
        connected: '23:36',
        ping: 200,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `95.159.190.250:50442`,
      },
      {
        userid: 11,
        name: 'seul',
        steam_id: `148928588`,
        connected: '23:18',
        ping: 100,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `188.186.228.16:18638`,
      },
    ]);
  });

  it('should parse 10 player game', () => {
    const raw = `hostname: Dota 2
  version : 41/41 0 secure
  steamid : [A:1:2462798875:39265] (90240636901086235)
  udp/ip  :  0.0.0.0:27035 os(Linux) type(dedicated)
  sourcetv:  port 27040, delay 120.0s
  players : 10 humans, 1 bots (15 max) (not hibernating)
  edicts : 1045 used of 2048 max
  gamestate: DOTA_GAMERULES_STATE_GAME_IN_PROGRESS Times: Transition=409.17 Current=1729.80
  # userid name uniqueid connected ping loss state rate adr
  # 2 "SourceTV" BOT active
  #  3 2 "Fosoroy через атос" [U:1:126880756] 28:53 87 0 active 80000 123.214.4.218:12345
  #  4 3 "Mieke" [U:1:1229265018] 28:53 67 0 active 80000 37.123.59.79:23456
  #  5 4 "pos 5 няшка" [U:1:314583257] 28:53 118 0 active 80000 91.218.102.123:12345
  #  6 5 "♿ИГРАЮКАКМОГУ♿" [U:1:97698090] 28:53 116 0 active 80000 145.255.231.232:93422
  #  7 6 "V" [U:1:253323011] 28:52 78 0 active 80000 195.228.79.228:49909
  #  8 7 "GTX 750 TI 2GB" [U:1:1584469629] 28:50 67 0 active 80000 146.123.215.185:60153
  #  9 8 "чморфлинг" [U:1:116062527] 28:50 196 0 active 80000 112.142.217.81:38840
  # 10 9 "torbasow" [U:1:148928588] 27:58 102 0 active 80000 88.86.232.48:49533
  # 11 10 "zxc" [U:1:294916479] 27:52 122 0 active 80000 176.326.522.167:6402
  # 14 11 "ЕБАНОЕ УЁБИЩЕ" [U:1:1126848000] 18:48 105 0 active 80000 85.14.01.93:6092
  #end
  L 01/05/2025 - 14:39:56: rcon from "178.70.209.156:56047": command "status"
  `;

    expect(parseStatusResponse(raw)).toEqual([
      {
        userid: 2,
        name: 'Fosoroy через атос',
        steam_id: `126880756`,
        connected: '28:53',
        ping: 87,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `123.214.4.218:12345`,
      },
      {
        userid: 3,
        name: 'Mieke',
        steam_id: `1229265018`,
        connected: '28:53',
        ping: 67,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `37.123.59.79:23456`,
      },
      {
        userid: 4,
        name: 'pos 5 няшка',
        steam_id: `314583257`,
        connected: '28:53',
        ping: 118,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `91.218.102.123:12345`,
      },
      {
        userid: 5,
        name: '♿ИГРАЮКАКМОГУ♿',
        steam_id: `97698090`,
        connected: '28:53',
        ping: 116,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `145.255.231.232:93422`,
      },
      {
        userid: 6,
        name: 'V',
        steam_id: `253323011`,
        connected: '28:52',
        ping: 78,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `195.228.79.228:49909`,
      },
      {
        userid: 7,
        name: 'GTX 750 TI 2GB',
        steam_id: `1584469629`,
        connected: '28:50',
        ping: 67,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `146.123.215.185:60153`,
      },
      {
        userid: 8,
        name: 'чморфлинг',
        steam_id: `116062527`,
        connected: '28:50',
        ping: 196,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `112.142.217.81:38840`,
      },
      {
        userid: 9,
        name: 'torbasow',
        steam_id: `148928588`,
        connected: '27:58',
        ping: 102,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `88.86.232.48:49533`,
      },
      {
        userid: 10,
        name: 'zxc',
        steam_id: `294916479`,
        connected: '27:52',
        ping: 122,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `176.326.522.167:6402`,
      },
      {
        userid: 11,
        name: 'ЕБАНОЕ УЁБИЩЕ',
        steam_id: `1126848000`,
        connected: '18:48',
        ping: 105,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `85.14.01.93:6092`,
      },
    ]);
  });
  it('should parse bad encoding status row', () => {
    const statusRow = `#  9 8 "P PPPPP"PP  PPPP"P" [U:1:254190013] 23:53 133 0 active 80000 212.15.61.67:62952`;
    const parsed = parseStatusRow(statusRow);
    expect(parsed).toEqual({
      userid: 8,
      name: `P PPPPP"PP  PPPP"P`,
      steam_id: '254190013',
      connected: '23:53',
      ping: 133,
      loss: 0,
      state: 'active',
      rate: 80000,
      adr: '212.15.61.67:62952',
    } satisfies SrcdsPlayerMetric);
  });
});
