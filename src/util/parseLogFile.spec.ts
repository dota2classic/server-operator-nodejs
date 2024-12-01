import * as fs from 'fs';
import { parseLog } from './parseLogFile';

describe('Log parsing', () => {
  it('should parse 1x1 log file', async () => {
    const f = await fs.promises
      .readFile('test/match_15984.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // Then
    expect(parsed.tower_damage).toEqual([7, 0]);

    console.log(parsed);
  });

  it('should parse 5x5 log file', async () => {
    const f = await fs.promises
      .readFile('test/match_16422.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    // Then
    expect(parsed.tower_damage).toHaveLength(10);
    expect(parsed.hero_damage).toHaveLength(10);
    expect(parsed.level).toHaveLength(10);
  });

  it('should parse 4x5 not full log file', async () => {
    const f = await fs.promises
      .readFile('test/4x5.log')
      .then((it) => it.toString());

    // When
    const parsed = parseLog(f);

    console.log(parsed);
    // Then
    expect(parsed.tower_damage).toHaveLength(10);
    expect(parsed.hero_damage).toHaveLength(10);
    expect(parsed.level).toHaveLength(9);
  });
});
