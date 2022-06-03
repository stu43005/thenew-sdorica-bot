import { Command } from '../command.js';
import AutoCrosspostingCommand from './auto-crossposting.js';
import AutoPinCommand from './autopin.js';
import MemeCommand from './meme.js';
import ReactionRoleCommand from './reaction-role.js';

export const configCommands: Command[] = [
    new AutoCrosspostingCommand(),
    new AutoPinCommand(),
    new MemeCommand(),
    new ReactionRoleCommand(),
];
