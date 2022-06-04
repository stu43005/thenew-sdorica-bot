import { REST } from '@discordjs/rest';
import config from 'config';
import { RESTPutAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v10';
import { Options } from 'discord.js';
import { createRequire } from 'node:module';
import { buttons } from './buttons/index.js';
import {
    Command,
    commands
} from './commands/index.js';
import { Database } from './database/database.js';
import {
    ButtonHandler,
    CommandHandler,
    GuildJoinHandler,
    GuildLeaveHandler,
    MessageHandler,
    ReactionHandler,
    TriggerHandler
} from './events/index.js';
import { Job } from './jobs/index.js';
import { Bot } from './models/bot.js';
import { CustomClient } from './models/custom-client.js';
import { reactions } from './reactions/index.js';
import { JobService, Logger } from './services/index.js';
import { triggers } from './triggers/index.js';

const require = createRequire(import.meta.url);
const Logs = require('../lang/logs.json');

async function start(): Promise<void> {
    // Database
    await Database.connect();

    // Client
    const client = new CustomClient({
        intents: config.get('client.intents'),
        partials: config.get('client.partials'),
        makeCache: Options.cacheWithLimits({
            // Keep default caching behavior
            ...Options.defaultMakeCacheSettings,
            // Override specific options from config
            ...config.get('client.caches'),
        }),
    });

    // Event handlers
    const guildJoinHandler = new GuildJoinHandler();
    const guildLeaveHandler = new GuildLeaveHandler();
    const commandHandler = new CommandHandler(commands);
    const buttonHandler = new ButtonHandler(buttons);
    const triggerHandler = new TriggerHandler(triggers);
    const messageHandler = new MessageHandler(triggerHandler);
    const reactionHandler = new ReactionHandler(reactions);

    // Jobs
    const jobs: Job[] = [
        // TODO: Add new jobs here
    ];

    // Bot
    const bot = new Bot(
        config.get('client.token'),
        client,
        guildJoinHandler,
        guildLeaveHandler,
        messageHandler,
        commandHandler,
        buttonHandler,
        reactionHandler,
        new JobService(jobs)
    );

    // Register
    if (process.argv[2] === '--register') {
        await registerCommands(commands);
        process.exit();
    } else if (process.argv[2] === '--clear') {
        await clearCommands();
        process.exit();
    }

    await bot.start();
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
        await rest.put(Routes.applicationCommands(config.get('client.id')), { body: [] });
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
