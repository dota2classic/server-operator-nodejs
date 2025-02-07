import * as fs from 'fs';

export const devnullstd = () => fs.createWriteStream('/dev/null');
