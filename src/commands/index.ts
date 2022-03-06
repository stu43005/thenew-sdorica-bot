import { Command } from './command.js';
import { DevCommand } from './dev-command.js';
import { funCommands } from './fun/index.js';
import { HelpCommand } from './help-command.js';
import { InfoCommand } from './info-command.js';
import { LinkCommand } from './link-command.js';
import { TestCommand } from './test-command.js';
import { TranslateCommand } from './translate-command.js';

export { Command, CommandDeferType } from './command.js';

export const commands: Command[] = [
    new DevCommand(),
    new HelpCommand(),
    new InfoCommand(),
    new LinkCommand(),
    new TestCommand(),
    new TranslateCommand(),
    // TODO: Add new commands here
    ...funCommands,
].sort((a, b) => (a.metadata.name > b.metadata.name ? 1 : -1));
