import {
    ApplicationCommandType,
    ContextMenuCommandBuilder,
    MessageContextMenuCommandInteraction,
    PermissionsString,
} from 'discord.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { CommandDeferType, MessageContextMenu } from '../command.js';

const hiddenFalse = ['system', 'pinned', 'tts', 'everyone', 'inline'];

export class MessageCodeCommand implements MessageContextMenu {
    public metadata = new ContextMenuCommandBuilder()
        .setName('message-code')
        .setType(ApplicationCommandType.Message)
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: MessageContextMenuCommandInteraction): Promise<void> {
        await InteractionUtils.send(
            intr,
            FormatUtils.codeBlock(
                'json',
                JSON.stringify(
                    intr.targetMessage,
                    (key, value) => {
                        if (value === null) return;
                        if (value instanceof Array && !value.length) return;
                        if (typeof value === 'object' && !Object.keys(value).length) return;
                        if (typeof value === 'boolean' && !value && hiddenFalse.includes(key))
                            return;
                        return value;
                    },
                    2
                )
            ),
            true
        );
    }
}
