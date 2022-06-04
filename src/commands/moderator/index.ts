import { CommandInteraction, ContextMenuInteraction } from 'discord.js';
import { Command } from '../command.js';
import DeleteBetweenCommand from './delete-between.js';
import ReportMessageCommand from './report-message.js';

export const moderatorCommands: Command<CommandInteraction | ContextMenuInteraction>[] = [
    new DeleteBetweenCommand(),
    new ReportMessageCommand(),
];
