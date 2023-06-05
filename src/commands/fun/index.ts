import { AppCommand } from '../command.js';
import { CodeCommand } from './code.js';
import { EmoteCommand } from './emote.js';
import { HitokotoCommand } from './hitokoto.js';
import { MessageCodeCommand } from './message-code.js';
import { SnowflakeCommand } from './snowflake.js';
import { StatsCommand } from './stats.js';
import { VideoArchiveCommand } from './video-archive.js';

export const funCommands: AppCommand[] = [
    new CodeCommand(),
    new EmoteCommand(),
    new HitokotoCommand(),
    new MessageCodeCommand(),
    new SnowflakeCommand(),
    new StatsCommand(),
    new VideoArchiveCommand(),
];
