import { Command } from '../command.js';
import { HitokotoCommand } from './hitokoto.js';

export const funCommands: Command[] = [
    new HitokotoCommand(),
];
