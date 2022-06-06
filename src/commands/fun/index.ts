import { AppCommand } from '../command.js';
import { HitokotoCommand } from './hitokoto.js';

export const funCommands: AppCommand[] = [
    new HitokotoCommand(),
];
