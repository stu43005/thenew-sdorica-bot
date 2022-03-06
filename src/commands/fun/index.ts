import { Command } from '../command.js';
import { HitokotoCommand } from './hitokoto.js';
import { PttCommand } from './ptt.js';

export const funCommands: Command[] = [
    new HitokotoCommand(),
    new PttCommand(),
];
