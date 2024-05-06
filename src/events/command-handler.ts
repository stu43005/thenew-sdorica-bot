import config from 'config';
import {
    AutocompleteInteraction,
    CommandInteraction,
    NewsChannel,
    TextChannel,
    ThreadChannel,
} from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';
import { AppCommand, CommandDeferType } from '../commands/command.js';
import { getGuildRepository } from '../database/entities/guild.js';
import { getUserRepository } from '../database/entities/user.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { Logger } from '../services/logger.js';
import { CommandUtils } from '../utils/command-utils.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { EventHandler } from './event-handler.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class CommandHandler implements EventHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.commands.amount'),
        config.get<number>('rateLimiting.commands.interval') * 1000
    );

    constructor(public commands: AppCommand[]) {}

    public async process(intr: CommandInteraction): Promise<void> {
        // Don't respond to self, or other bots
        if (intr.user.id === intr.client.user?.id || intr.user.bot) {
            return;
        }

        // Check if user is rate limited
        const limited = this.rateLimiter.take(intr.user.id);
        if (limited) {
            return;
        }

        // Try to find the command the user wants
        const command = this.commands.find(command => command.metadata.name === intr.commandName);
        if (!command) {
            Logger.error(
                Logs.error.commandNotFound
                    .replaceAll('{INTERACTION_ID}', intr.id)
                    .replaceAll('{COMMAND_NAME}', intr.commandName)
            );
            return;
        }

        // Defer interaction
        // NOTE: Anything after this point we should be responding to the interaction
        switch (command.deferType) {
            case CommandDeferType.PUBLIC: {
                await InteractionUtils.deferReply(intr, false);
                break;
            }
            case CommandDeferType.HIDDEN: {
                await InteractionUtils.deferReply(intr, true);
                break;
            }
        }

        // Return if defer was unsuccessful
        if (command.deferType !== CommandDeferType.NONE && !intr.deferred) {
            return;
        }

        const data = new EventData(
            await getUserRepository().findById(intr.user.id),
            intr.guild ? await getGuildRepository().findById(intr.guild.id) : undefined
        );

        try {
            // Check if interaction passes command checks
            const passesChecks = await CommandUtils.runChecks(command, intr, data);
            if (passesChecks) {
                // Execute the command
                await command.execute(intr, data);
            }
        } catch (error) {
            await this.sendError(intr, data);

            // Log command error
            Logger.error(
                intr.channel instanceof TextChannel ||
                    intr.channel instanceof NewsChannel ||
                    intr.channel instanceof ThreadChannel
                    ? Logs.error.commandGuild
                          .replaceAll('{INTERACTION_ID}', intr.id)
                          .replaceAll('{COMMAND_NAME}', command.metadata.name)
                          .replaceAll('{USER_TAG}', intr.user.username)
                          .replaceAll('{USER_ID}', intr.user.id)
                          .replaceAll('{CHANNEL_NAME}', intr.channel.name)
                          .replaceAll('{CHANNEL_ID}', intr.channel.id)
                          .replaceAll('{GUILD_NAME}', intr.guild?.name)
                          .replaceAll('{GUILD_ID}', intr.guild?.id)
                    : Logs.error.commandOther
                          .replaceAll('{INTERACTION_ID}', intr.id)
                          .replaceAll('{COMMAND_NAME}', command.metadata.name)
                          .replaceAll('{USER_TAG}', intr.user.username)
                          .replaceAll('{USER_ID}', intr.user.id),
                error
            );
        }
    }

    public async autocomplete(intr: AutocompleteInteraction): Promise<void> {
        // Don't respond to self, or other bots
        if (intr.user.id === intr.client.user?.id || intr.user.bot) {
            return;
        }

        // Try to find the command the user wants
        const command = this.commands.find(command => command.metadata.name === intr.commandName);
        if (!command) {
            return;
        }

        const data = new EventData(
            await getUserRepository().findById(intr.user.id),
            intr.guild ? await getGuildRepository().findById(intr.guild.id) : undefined
        );

        try {
            // Execute the command
            if (command.autocomplete) {
                await command.autocomplete(intr, data);
            }
        } catch (error) {
            // Log command error
            Logger.error(
                intr.channel instanceof TextChannel ||
                    intr.channel instanceof NewsChannel ||
                    intr.channel instanceof ThreadChannel
                    ? Logs.error.commandGuild
                          .replaceAll('{INTERACTION_ID}', intr.id)
                          .replaceAll('{COMMAND_NAME}', command.metadata.name)
                          .replaceAll('{USER_TAG}', intr.user.username)
                          .replaceAll('{USER_ID}', intr.user.id)
                          .replaceAll('{CHANNEL_NAME}', intr.channel.name)
                          .replaceAll('{CHANNEL_ID}', intr.channel.id)
                          .replaceAll('{GUILD_NAME}', intr.guild?.name)
                          .replaceAll('{GUILD_ID}', intr.guild?.id)
                    : Logs.error.commandOther
                          .replaceAll('{INTERACTION_ID}', intr.id)
                          .replaceAll('{COMMAND_NAME}', command.metadata.name)
                          .replaceAll('{USER_TAG}', intr.user.username)
                          .replaceAll('{USER_ID}', intr.user.id),
                error
            );
        }
    }

    private async sendError(intr: CommandInteraction, data: EventData): Promise<void> {
        try {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('errorEmbeds.command', data.lang(), {
                    ERROR_CODE: intr.id,
                })
            );
        } catch {
            // Ignore
        }
    }
}
