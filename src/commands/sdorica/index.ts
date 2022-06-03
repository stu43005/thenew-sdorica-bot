import { Command } from '../command.js';
import { GashaponCommand } from './gashapon.js';
import { MonsterCommand } from './monster.js';

export const sdoricaCommands: Command[] = [
    new GashaponCommand(),
    new MonsterCommand(),
];
