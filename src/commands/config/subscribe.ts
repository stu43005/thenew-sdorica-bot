import config from 'config';
import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import {
    getScrapingSourceRepository,
    ScrapingSource,
    ScrapingSubscription,
} from '../../database/entities/scraping.js';
import { Scraping } from '../../jobs/scraping.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class SubscribeCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('subscribe')
        .setDescription('訂閱消息來源')
        .addStringOption(builder =>
            builder.setName('id').setDescription('消息來源').setRequired(true).setAutocomplete(true)
        )
        .addBooleanOption(builder => builder.setName('remove').setDescription('取消訂閱'))
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageWebhooks').valueOf())
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = ['ManageWebhooks'];
    public requireUserPerms: PermissionsString[] = ['ManageWebhooks'];

    private scrapings: Scraping[];

    constructor() {
        this.scrapings = config.get<Scraping[]>('scrapings').filter(scraping => scraping.enabled);
    }

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const id = intr.options.getString('id', true);
        const remove = intr.options.getBoolean('remove');
        const scraping = this.scrapings.find(scraping => scraping.id === id);

        if (scraping) {
            const scrapingSource = await getScrapingSourceRepository().getOrCreate(
                scraping.id,
                ScrapingSource
            );
            let subscribe = await scrapingSource.subscriptions?.findById(intr.channelId);
            if (subscribe) {
                if (remove) {
                    await scrapingSource.subscriptions?.delete(intr.channelId);
                    await InteractionUtils.send(
                        intr,
                        `已取消訂閱此消息來源：${FormatUtils.inlineCode(id)}`,
                        true
                    );
                } else {
                    await InteractionUtils.send(
                        intr,
                        `已經訂閱此消息來源：${FormatUtils.inlineCode(id)}`,
                        true
                    );
                }
            } else {
                if (remove) {
                    await InteractionUtils.send(
                        intr,
                        `已取消訂閱此消息來源：${FormatUtils.inlineCode(id)}`,
                        true
                    );
                } else if (intr.channel && 'fetchWebhooks' in intr.channel) {
                    const webhooks = await intr.channel.fetchWebhooks();
                    let webhook = webhooks.find(
                        webhook => webhook.owner?.id === intr.client.user?.id
                    );
                    if (!webhook) {
                        webhook = await intr.channel.createWebhook({
                            name: `${intr.client.user?.username} Auto-Post`,
                            avatar: intr.client.user?.avatarURL(),
                        });
                    }

                    subscribe = new ScrapingSubscription();
                    subscribe.id = intr.channelId;
                    subscribe.guildId = intr.guildId;
                    subscribe.url = webhook.url;
                    await scrapingSource.subscriptions?.create(subscribe);

                    await InteractionUtils.send(
                        intr,
                        `訂閱成功：${FormatUtils.inlineCode(id)}`,
                        true
                    );
                } else {
                    await InteractionUtils.send(intr, `本頻道無法訂閱`, true);
                }
            }
        } else {
            await InteractionUtils.send(
                intr,
                `找不到此消息來源：${FormatUtils.inlineCode(id)}`,
                true
            );
        }
    }

    public async autocomplete(intr: AutocompleteInteraction): Promise<void> {
        const focusedValue = intr.options.getFocused();
        const choices = [...new Set(this.scrapings.map(scraping => scraping.id))];
        const filtered = choices
            .filter(choice => choice.includes(focusedValue.toString()))
            .slice(0, 25);
        await intr.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }
}
