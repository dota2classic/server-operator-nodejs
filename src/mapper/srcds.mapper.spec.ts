import { MatchFinishedOnSRCDS } from '../operator/dto';
import { SrcdsMapper } from './srcds.mapper';

describe('SrcdsMapper', () => {
  const mapper = new SrcdsMapper();

  it('should map to game results event', () => {
    const d: MatchFinishedOnSRCDS = {
      matchId: 25516,
      winner: 2,
      duration: 1540,
      type: 1,
      gameMode: 22,
      timestamp: 1744407146,
      server: '46.174.55.100:24101',
      players: [
        {
          hero: 'npc_dota_hero_pudge',
          steam_id: 91401788,
          team: 2,
          level: 11,
          kills: 0,
          deaths: 4,
          assists: 14,
          gpm: 332,
          xpm: 237,
          last_hits: 38,
          denies: 2,
          tower_kills: 0,
          roshan_kills: 0,
          networth: 9669,
          connection: 2,
          items: [
            'item_tranquil_boots',
            'item_magic_wand',
            'item_tpscroll',
            'item_recipe_lotus_orb',
            'item_pers',
            'item_blade_mail',
          ],
        },
        {
          hero: 'npc_dota_hero_techies',
          steam_id: 115580930,
          team: 2,
          level: 9,
          kills: 8,
          deaths: 6,
          assists: 2,
          gpm: 307,
          xpm: 166,
          last_hits: 14,
          denies: 0,
          tower_kills: 0,
          roshan_kills: 0,
          networth: 6981,
          connection: 2,
          items: [
            'item_arcane_boots',
            'item_blink',
            'item_soul_ring',
            'item_tpscroll',
            'item_ward_sentry',
            'item_dust',
          ],
        },
        {
          hero: 'npc_dota_hero_bounty_hunter',
          steam_id: 253323011,
          team: 2,
          level: 15,
          kills: 15,
          deaths: 1,
          assists: 5,
          gpm: 598,
          xpm: 382,
          last_hits: 58,
          denies: 7,
          tower_kills: 0,
          roshan_kills: 0,
          networth: 18544,
          connection: 2,
          items: [
            'item_magic_wand',
            'item_dagon_5',
            'item_ethereal_blade',
            'item_tpscroll',
            'item_arcane_boots',
            'item_pipe',
          ],
        },
        {
          hero: 'npc_dota_hero_venomancer',
          steam_id: 1427685866,
          team: 2,
          level: 11,
          kills: 1,
          deaths: 1,
          assists: 14,
          gpm: 338,
          xpm: 255,
          last_hits: 40,
          denies: 2,
          tower_kills: 1,
          roshan_kills: 400,
          networth: 10614,
          connection: 2,
          items: [
            'item_tranquil_boots',
            'item_magic_wand',
            'item_veil_of_discord',
            'item_ring_of_aquila',
            'item_dust',
            'item_urn_of_shadows',
          ],
        },
        {
          hero: 'npc_dota_hero_meepo',
          steam_id: 1770781994,
          team: 2,
          level: 23,
          kills: 12,
          deaths: 2,
          assists: 4,
          gpm: 728,
          xpm: 902,
          last_hits: 265,
          denies: 5,
          tower_kills: 8,
          roshan_kills: 1845,
          networth: 22195,
          connection: 2,
          items: [
            'item_blink',
            'item_ethereal_blade',
            'item_ultimate_scepter',
            'item_power_treads',
            'item_diffusal_blade_2',
            'item_diffusal_blade_2',
          ],
        },
        {
          hero: 'npc_dota_hero_antimage',
          steam_id: 208516508,
          team: 3,
          level: 13,
          kills: 1,
          deaths: 5,
          assists: 2,
          gpm: 322,
          xpm: 320,
          last_hits: 169,
          denies: 0,
          tower_kills: 0,
          roshan_kills: 21,
          networth: 8764,
          connection: 2,
          items: [
            'item_power_treads',
            'item_stout_shield',
            'item_bfury',
            'item_empty',
            'item_vladmir',
            'item_empty',
          ],
        },
        {
          hero: 'npc_dota_hero_invoker',
          steam_id: 207521528,
          team: 3,
          level: 9,
          kills: 1,
          deaths: 6,
          assists: 0,
          gpm: 175,
          xpm: 151,
          last_hits: 45,
          denies: 12,
          tower_kills: 0,
          roshan_kills: 0,
          networth: 4918,
          connection: 2,
          items: [
            'item_sobi_mask',
            'item_void_stone',
            'item_phase_boots',
            'item_hand_of_midas',
            'item_empty',
            'item_empty',
          ],
        },
        {
          hero: 'npc_dota_hero_pugna',
          steam_id: 367513425,
          team: 3,
          level: 9,
          kills: 2,
          deaths: 14,
          assists: 0,
          gpm: 197,
          xpm: 168,
          last_hits: 61,
          denies: 4,
          tower_kills: 0,
          roshan_kills: 0,
          networth: 3082,
          connection: 2,
          items: [
            'item_null_talisman',
            'item_bottle',
            'item_boots',
            'item_tpscroll',
            'item_ogre_axe',
            'item_empty',
          ],
        },
        {
          hero: 'npc_dota_hero_nyx_assassin',
          steam_id: 172030769,
          team: 3,
          level: 10,
          kills: 2,
          deaths: 6,
          assists: 3,
          gpm: 197,
          xpm: 181,
          last_hits: 41,
          denies: 6,
          tower_kills: 0,
          roshan_kills: 400,
          networth: 4452,
          connection: 2,
          items: [
            'item_arcane_boots',
            'item_empty',
            'item_urn_of_shadows',
            'item_magic_wand',
            'item_tpscroll',
            'item_empty',
          ],
        },
        {
          hero: 'npc_dota_hero_lion',
          steam_id: 839854692,
          team: 3,
          level: 8,
          kills: 1,
          deaths: 5,
          assists: 1,
          gpm: 127,
          xpm: 129,
          last_hits: 14,
          denies: 8,
          tower_kills: 0,
          roshan_kills: 0,
          networth: 2537,
          connection: 2,
          items: [
            'item_tranquil_boots',
            'item_shadow_amulet',
            'item_empty',
            'item_empty',
            'item_empty',
            'item_empty',
          ],
        },
      ],
    };

    expect(mapper.mapResults(d)).toBeDefined();
  });
});
