import { AppCommand } from '../command.js';
import { EmoteCommand } from './emote.js';
import { HitokotoCommand } from './hitokoto.js';

export const funCommands: AppCommand[] = [
    new HitokotoCommand(),
    new EmoteCommand(),
];
