import { ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder } from 'discord.js';
import { LangCode } from '../enums/lang-code.js';
import { Language } from '../models/enum-helpers/language.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { Command, CommandDeferType } from './command.js';

export class TranslateCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName(Lang.getCom('commands.translate'))
        .setDescription(Lang.getRef('commandDescs.translate', Lang.Default))
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const embed = Lang.getEmbed('displayEmbeds.translate', data.lang());
        for (const langCode of Object.values(LangCode)) {
            embed.addFields({
                name: Language.displayName(langCode),
                value: Language.translators(langCode),
            });
        }
        await InteractionUtils.send(intr, embed);
    }
}
