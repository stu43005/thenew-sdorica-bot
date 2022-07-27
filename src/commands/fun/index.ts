import { AppCommand } from '../command.js';
import { CodeCommand } from './code.js';
import { EmoteCommand } from './emote.js';
import { HitokotoCommand } from './hitokoto.js';
import { SnowflakeCommand } from './snowflake.js';

export const funCommands: AppCommand[] = [
    new CodeCommand(),
    new HitokotoCommand(),
    new EmoteCommand(),
    new SnowflakeCommand(),
];
