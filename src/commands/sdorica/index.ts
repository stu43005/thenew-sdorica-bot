import { AppCommand } from '../command.js';
import { GashaponCommand } from './gashapon.js';
import { MonsterCommand } from './monster.js';
import { WikiCommand } from './wiki.js';

export const sdoricaCommands: AppCommand[] = [
    new GashaponCommand(),
    new MonsterCommand(),
    new WikiCommand(),
];
