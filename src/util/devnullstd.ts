import * as fs from 'fs';

export const devnullstd = (): NodeJS.WriteStream =>
  fs.createWriteStream('/dev/null');
