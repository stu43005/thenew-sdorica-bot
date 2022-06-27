import { inlineCode, SlashCommandBuilder } from '@discordjs/builders';
import { AutocompleteInteraction, CommandInteraction, PermissionString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../command.js';
import { getMemeEmbed, MemeItem, metchMeme } from '../config/meme.js';

export class EmoteCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('emote')
        .setDescription('顯示自訂圖片')
        .addStringOption((builder) => builder
            .setName('keyword')
            .setDescription('關鍵字')
            .setRequired(true)
            .setAutocomplete(true))
        .toJSON();
    public channelCooldown = new RateLimiter(2, 60 * 1000);
    public deferType = CommandDeferType.NONE;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionString[] = [];
    public requireUserPerms: PermissionString[] = [];

    public async execute(intr: CommandInteraction, data: EventData): Promise<void> {
        if (!data.guild?.memes?.length) return;

        const memes: MemeItem[] = data.guild?.memes;
        const keyword = intr.options.getString('keyword', true);
        const match = metchMeme(memes, keyword, true);

        if (match) {
            const limited = this.channelCooldown.take(intr.channelId);
            if (limited) {
                await InteractionUtils.send(intr, `使用速度過快`, true);
                return;
            }

            const member = await InteractionUtils.getMemberOrUser(intr);
            const embed = getMemeEmbed(member, match);
            await InteractionUtils.send(intr, embed);
        } else {
            await InteractionUtils.send(intr, `找不到此關鍵字：${inlineCode(keyword)}`, true);
        }
    }

    public async autocomplete(intr: AutocompleteInteraction, data: EventData): Promise<void> {
        if (!data.guild?.memes?.length) {
            await intr.respond([]);
            return;
        }

        const focusedValue = intr.options.getFocused();
        const choices = [...new Set(data.guild.memes.map(meme => meme.keyword))];
        const filtered = choices.filter(choice => choice.includes(focusedValue.toString())).slice(0, 25);
        await intr.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }
}
