import { AppCommand } from '../command.js';
import DeleteBetweenCommand from './delete-between.js';
import ReportMessageCommand from './report-message.js';

export const moderatorCommands: AppCommand[] = [
    new DeleteBetweenCommand(),
    new ReportMessageCommand(),
];
