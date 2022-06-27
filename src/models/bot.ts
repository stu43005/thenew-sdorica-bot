import config from 'config';
import {
    Client, Constants,
    Guild,
    Interaction,
    Message,
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    RateLimitData,
    User
} from 'discord.js';
import { createRequire } from 'node:module';
import { customEvents } from '../custom-events/index.js';
import { CommandHandler } from '../events/command-handler.js';
import { ComponentHandler } from '../events/component-handler.js';
import { GuildJoinHandler } from '../events/guild-join-handler.js';
import { GuildLeaveHandler } from '../events/guild-leave-handler.js';
import { MessageHandler } from '../events/message-handler.js';
import { ReactionHandler } from '../events/reaction-handler.js';
import { JobService, Logger } from '../services/index.js';
import { ConfigUtils } from '../utils/config-utils.js';
import { PartialUtils } from '../utils/index.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class Bot {
    private ready = false;

    constructor(
        private token: string,
        private client: Client,
        private guildJoinHandler: GuildJoinHandler,
        private guildLeaveHandler: GuildLeaveHandler,
        private messageHandler: MessageHandler,
        private commandHandler: CommandHandler,
        private componentHandler: ComponentHandler,
        private reactionHandler: ReactionHandler,
        private jobService: JobService
    ) { }

    public async start(): Promise<void> {
        this.registerListeners();
        await this.login(this.token);
    }

    private registerListeners(): void {
        this.client.on(Constants.Events.CLIENT_READY, () => this.onReady());
        this.client.on(
            Constants.Events.SHARD_READY,
            (shardId: number, unavailableGuilds?: Set<string>) =>
                this.onShardReady(shardId, unavailableGuilds)
        );
        this.client.on(Constants.Events.GUILD_CREATE, (guild: Guild) => this.onGuildJoin(guild));
        this.client.on(Constants.Events.GUILD_DELETE, (guild: Guild) => this.onGuildLeave(guild));
        this.client.on(Constants.Events.MESSAGE_CREATE, (msg: Message) => this.onMessage(msg));
        this.client.on(Constants.Events.INTERACTION_CREATE, (intr: Interaction) =>
            this.onInteraction(intr)
        );
        this.client.on(
            Constants.Events.MESSAGE_REACTION_ADD,
            (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
                this.onReaction(messageReaction, user, false)
        );
        this.client.on(
            Constants.Events.MESSAGE_REACTION_REMOVE,
            (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
                this.onReaction(messageReaction, user, true)
        );
        this.client.on(Constants.Events.RATE_LIMIT, (rateLimitData: RateLimitData) =>
            this.onRateLimit(rateLimitData)
        );

        for (const custom of customEvents) {
            this.client.on(custom.event, (...args) =>
                custom.process(...args)
            );
        }
    }

    private async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
        } catch (error) {
            Logger.error(Logs.error.clientLogin, error);
            return;
        }
    }

    private async onReady(): Promise<void> {
        const userTag = this.client.user?.tag;
        Logger.info(Logs.info.clientLogin.replaceAll('{USER_TAG}', userTag));

        if (!config.get('debug.dummyMode.enabled')) {
            this.jobService.start();
        }

        this.ready = true;
        Logger.info(Logs.info.clientReady, {
            debug: ConfigUtils.isDevMode(),
        });
    }

    private onShardReady(shardId: number, _unavailableGuilds?: Set<string>): void {
        Logger.setShardId(shardId);
    }

    private async onGuildJoin(guild: Guild): Promise<void> {
        if (!this.ready || config.get('debug.dummyMode.enabled')) {
            return;
        }

        try {
            await this.guildJoinHandler.process(guild);
        } catch (error) {
            Logger.error(Logs.error.guildJoin, error);
        }
    }

    private async onGuildLeave(guild: Guild): Promise<void> {
        if (!this.ready || config.get('debug.dummyMode.enabled')) {
            return;
        }

        try {
            await this.guildLeaveHandler.process(guild);
        } catch (error) {
            Logger.error(Logs.error.guildLeave, error);
        }
    }

    private async onMessage(msg: Message): Promise<void> {
        if (
            !this.ready ||
            (config.get('debug.dummyMode.enabled') && !config.get<string[]>('debug.dummyMode.whitelist').includes(msg.author.id))
        ) {
            return;
        }

        const fullMsg = await PartialUtils.fillMessage(msg);
        if (!fullMsg) {
            return;
        }

        try {
            await this.messageHandler.process(fullMsg);
        } catch (error) {
            Logger.error(Logs.error.message, error);
        }
    }

    private async onInteraction(intr: Interaction): Promise<void> {
        if (
            !this.ready ||
            (config.get('debug.dummyMode.enabled') && !config.get<string[]>('debug.dummyMode.whitelist').includes(intr.user.id))
        ) {
            return;
        }

        if (intr.isApplicationCommand() || intr.isAutocomplete()) {
            try {
                Logger.debug(`Receiving interaction: ${intr.id}, type: ${intr.type}, commandName: ${intr.commandName}`);
                if (intr.isAutocomplete()) {
                    await this.commandHandler.autocomplete(intr);
                } else {
                    await this.commandHandler.process(intr);
                }
            } catch (error) {
                Logger.error(Logs.error.command, error);
            }
        } else if (intr.isMessageComponent() || intr.isModalSubmit()) {
            try {
                Logger.debug(`Receiving interaction: ${intr.id}, type: ${intr.type}, customId: ${intr.customId}`);
                await this.componentHandler.process(intr, intr.message as Message);
            } catch (error) {
                Logger.error(Logs.error.component, error);
            }
        }
    }

    private async onReaction(
        msgReaction: MessageReaction | PartialMessageReaction,
        reactor: User | PartialUser,
        remove: boolean,
    ): Promise<void> {
        if (
            !this.ready ||
            (config.get('debug.dummyMode.enabled') && !config.get<string[]>('debug.dummyMode.whitelist').includes(reactor.id))
        ) {
            return;
        }

        const fullMsgReaction = await PartialUtils.fillReaction(msgReaction);
        if (!fullMsgReaction || fullMsgReaction.message.partial) {
            return;
        }

        const fullReactor = await PartialUtils.fillUser(reactor);
        if (!fullReactor) {
            return;
        }

        try {
            await this.reactionHandler.process(
                fullMsgReaction,
                fullMsgReaction.message,
                fullReactor,
                remove,
            );
        } catch (error) {
            Logger.error(Logs.error.reaction, error);
        }
    }

    private async onRateLimit(rateLimitData: RateLimitData): Promise<void> {
        if (rateLimitData.timeout >= config.get<number>('logging.rateLimit.minTimeout') * 1000) {
            Logger.error(Logs.error.apiRateLimit, rateLimitData);
        }
    }
}
