require('dotenv').config();



export const RCON_PASSWORD = () => process.env.RCON_PASSWORD || 'undefined';
