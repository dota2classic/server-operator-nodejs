import { Dota_Tower, getTowerState } from '../gateway/util/tower-state';
import { Dota_Barrack, getBarrackState } from '../gateway/util/barrack-state';

describe('Barrack and tower status', () => {
  it('should parse tower state', () => {
    expect(getTowerState(1796, Dota_Tower.TOP_TIER_2)).toEqual(false);
    expect(getTowerState(1796, Dota_Tower.TOP_TIER_3)).toEqual(true);

    expect(getTowerState(0, Dota_Tower.ANCIENT_BOTTOM)).toEqual(false);
    expect(getTowerState(0, Dota_Tower.ANCIENT_TOP)).toEqual(false);
  });

  it('should should parse barrack state', () => {
    expect(getBarrackState(51, Dota_Barrack.MIDDLE_MELEE)).toEqual(false);
    expect(getBarrackState(51, Dota_Barrack.MIDDLE_RANGED)).toEqual(false);

    expect(getBarrackState(51, Dota_Barrack.BOTTOM_MELEE)).toEqual(true);
    expect(getBarrackState(51, Dota_Barrack.TOP_MELEE)).toEqual(true);
  });
});
