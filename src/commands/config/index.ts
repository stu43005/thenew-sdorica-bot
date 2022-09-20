import { AppCommand } from '../command.js';
import AutoCrosspostingCommand from './auto-crossposting.js';
import AutoPinCommand from './autopin.js';
import MemeImportCommand from './meme-import.js';
import MemeCommand from './meme.js';
import ReactionRoleCommand from './reaction-role.js';
import StarboardCommand from './starboard.js';
import SubscribeCommand from './subscribe.js';

export const configCommands: AppCommand[] = [
    new AutoCrosspostingCommand(),
    new AutoPinCommand(),
    new MemeImportCommand(),
    new MemeCommand(),
    new ReactionRoleCommand(),
    new StarboardCommand(),
    new SubscribeCommand(),
];
