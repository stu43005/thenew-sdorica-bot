import { AppCommand } from '../command.js';
import CheckEmojiCommand from './check-emoji.js';
import DeleteBetweenCommand from './delete-between.js';
import ReportMessageCommand from './report-message.js';
import StarboardAnalyticsCommand from './starboard-analytics.js';

export const moderatorCommands: AppCommand[] = [
    new CheckEmojiCommand(),
    new DeleteBetweenCommand(),
    new ReportMessageCommand(),
    new StarboardAnalyticsCommand(),
];
