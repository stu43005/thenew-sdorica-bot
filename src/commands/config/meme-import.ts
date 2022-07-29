import {
    ChatInputCommandInteraction,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import fetch from 'node-fetch';
import * as crypto from 'node:crypto';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';
import { getMatchType, MatchType, MemeItem } from './meme.js';

export default class MemeImportCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('meme-import')
        .setDescription('批次匯入梗圖')
        .addAttachmentOption(builder =>
            builder.setName('json').setDescription('匯入json檔案').setRequired(true)
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageGuild').valueOf())
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = ['ManageGuild'];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild || !data.guild) return;

        const jsonAttachment = intr.options.getAttachment('json', true);
        try {
            const res = await fetch(jsonAttachment.url);
            const content = await res.text();
            const json = JSON.parse(content) as MemeItem[];

            if (Array.isArray(json)) {
                const memes: MemeItem[] = data.guild.memes ?? [];
                const errors: string[] = [];
                let addCount = 0;
                json.forEach((item, index) => {
                    if (item.keyword && item.url) {
                        if (
                            memes.some(
                                meme => item.keyword === meme.keyword && item.url === meme.url
                            )
                        ) {
                            // same keyword and url already exists
                            return;
                        }
                        const matchtype =
                            (item.matchtype && getMatchType(item.matchtype)) || MatchType.Normal;
                        memes.push({
                            uuid: crypto.randomUUID(),
                            keyword: item.keyword,
                            url: item.url,
                            matchtype,
                        });
                        addCount++;
                    } else {
                        errors.push(`index:[${index}] missing keyword or url.`);
                    }
                });

                data.guild.memes = memes;
                await data.guild.update();
                await InteractionUtils.send(
                    intr,
                    `Imported ${addCount} memes.${
                        errors.length ? `\nErrors:\n${errors.join('\n')}` : ''
                    }`
                );
            } else {
                await InteractionUtils.send(intr, 'json is not a array.');
            }
        } catch (error: any) {
            await InteractionUtils.send(intr, error.toString());
        }
    }
}
