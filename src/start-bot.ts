import config from 'config';
import {
    GatewayIntentBits,
    Options,
    Partials,
    REST,
    RESTPutAPIApplicationCommandsJSONBody,
    Routes,
} from 'discord.js';
import { createRequire } from 'node:module';
import process from 'node:process';
import { Command } from './commands/command.js';
import { commands } from './commands/index.js';
import { components } from './components/index.js';
import { Database } from './database/database.js';
import { CommandHandler } from './events/command-handler.js';
import { ComponentHandler } from './events/component-handler.js';
import { GuildJoinHandler } from './events/guild-join-handler.js';
import { GuildLeaveHandler } from './events/guild-leave-handler.js';
import { MessageHandler } from './events/message-handler.js';
import { ReactionHandler } from './events/reaction-handler.js';
import { TriggerHandler } from './events/trigger-handler.js';
import { jobs } from './jobs/index.js';
import { Bot } from './models/bot.js';
import { CustomClient } from './models/custom-client.js';
import { reactions } from './reactions/index.js';
import { JobService } from './services/job-service.js';
import { Logger } from './services/logger.js';
import { triggers } from './triggers/index.js';

const require = createRequire(import.meta.url);
const Logs = require('../lang/logs.json');

async function start(): Promise<void> {
    // Database
    await Database.connect();

    // Client
    const client = new CustomClient({
        intents: [
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        makeCache: Options.cacheWithLimits({
            // Keep default caching behavior
            ...Options.DefaultMakeCacheSettings,
            // Override specific options from config
            ...config.get('client.caches'),
        }),
    });

    // Event handlers
    const guildJoinHandler = new GuildJoinHandler();
    const guildLeaveHandler = new GuildLeaveHandler();
    const commandHandler = new CommandHandler(commands);
    const componentHandler = new ComponentHandler(components);
    const triggerHandler = new TriggerHandler(triggers);
    const messageHandler = new MessageHandler(triggerHandler);
    const reactionHandler = new ReactionHandler(reactions);

    // Bot
    const bot = new Bot(
        config.get('client.token'),
        client,
        guildJoinHandler,
        guildLeaveHandler,
        messageHandler,
        commandHandler,
        componentHandler,
        reactionHandler,
        new JobService(jobs)
    );

    // Register
    if (process.argv[2] === '--register') {
        await registerCommands(commands);
    } else if (process.argv[2] === '--clear') {
        await clearCommands();
    } else {
        await bot.start();
    }
}

async function registerCommands(commands: Command[]): Promise<void> {
    const cmdDatas: RESTPutAPIApplicationCommandsJSONBody = commands.map(cmd => cmd.metadata);
    const cmdNames = cmdDatas.map(cmdData => cmdData.name);

    Logger.info(
        Logs.info.commandsRegistering.replaceAll(
            '{COMMAND_NAMES}',
            cmdNames.map(cmdName => `'${cmdName}'`).join(', ')
        )
    );

    try {
        const rest = new REST({ version: '9' }).setToken(config.get('client.token'));
        await rest.put(Routes.applicationCommands(config.get('client.id')), { body: cmdDatas });
    } catch (error) {
        Logger.error(Logs.error.commandsRegistering, error);
        return;
    }

    Logger.info(Logs.info.commandsRegistered);
}

async function clearCommands(): Promise<void> {
    Logger.info(Logs.info.commandsClearing);

    try {
        const rest = new REST({ version: '9' }).setToken(config.get('client.token'));
        await rest.put(Routes.applicationCommands(config.get('client.id')), { body: [] });
    } catch (error) {
        Logger.error(Logs.error.commandsClearing, error);
        return;
    }

    Logger.info(Logs.info.commandsCleared);
}

process.on('unhandledRejection', (reason, _promise) => {
    Logger.error(Logs.error.unhandledRejection, reason);
});

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});
