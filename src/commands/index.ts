import { Command } from './command.js';
import { configCommands } from './config/index.js';
import { DevCommand } from './dev-command.js';
import { funCommands } from './fun/index.js';
import { moderatorCommands } from './moderator/index.js';
import { sdoricaCommands } from './sdorica/index.js';

export { Command, CommandDeferType } from './command.js';

export const commands: Command[] = [
    new DevCommand(),
    // new HelpCommand(),
    // new InfoCommand(),
    // new LinkCommand(),
    // new TestCommand(),
    // new TranslateCommand(),

    ...configCommands,
    ...funCommands,
    ...moderatorCommands,
    ...sdoricaCommands,
].sort((a, b) => (a.metadata.name > b.metadata.name ? 1 : -1));
