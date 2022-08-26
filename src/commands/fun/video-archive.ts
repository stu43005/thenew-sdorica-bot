import config from 'config';
import { ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { Api } from '../../api/api.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class VideoArchiveCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('video-archive')
        .setDescription('開始錄製影片')
        .setDMPermission(false)
        .addStringOption(builder =>
            builder.setName('video').setDescription('video').setRequired(true)
        )
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];
    public authToken: string = config.get('api.secret');

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const video = intr.options.getString('video', true);
        const res = await fetch(`http://localhost:${Api.port}/video-archive`, {
            method: 'post',
            headers: {
                authorization: this.authToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                video,
                webhook: intr.webhook.url,
            }),
        });
        if (res.status === 200) {
            await InteractionUtils.send(intr, `Added ${FormatUtils.inlineCode(video)} to queue.`);
        } else {
            const text = await res.text();
            await InteractionUtils.send(
                intr,
                `Failed with ${res.status} ${res.statusText}: ${text}`
            );
        }
    }
}
