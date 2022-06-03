import { Command } from '../command.js';
import DeleteBetweenCommand from './delete-between.js';

export const moderatorCommands: Command[] = [
    new DeleteBetweenCommand(),
];
