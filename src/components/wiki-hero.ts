import { ButtonInteraction, Message, StringSelectMenuInteraction } from 'discord.js';
import { getInteractionDataRepository, InteractionData } from '../database/entities/interaction.js';
import { EventData } from '../models/event-data.js';
import { Logger } from '../services/logger.js';
import {
    calcSkillsetData,
    checkOutOfRankLimit,
    fetchSkillsetData,
    generateSkillsetComponent,
    generateSkillsetEmbed,
    SkillId,
    Skillset,
    SkillsetData,
} from '../services/wiki.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { Button, MessageComponentDeferType, StringSelectMenu } from './component.js';

export default class WikiHeroAction implements Button, StringSelectMenu {
    public ids = [
        'wikihero-levelup-',
        'wikihero-leveldown-',
        'wikihero-rankup-',
        'wikihero-rankdown-',
        'wikihero-select-',
    ];
    public deferType = MessageComponentDeferType.UPDATE;
    public requireGuild = false;
    public requireEmbedAuthorTag = true;

    public async execute(
        intr: ButtonInteraction | StringSelectMenuInteraction,
        _msg: Message,
        _data: EventData
    ): Promise<void> {
        const [, action, intrId] = intr.customId.split('-');

        const data = (await getInteractionDataRepository().findById(
            intrId
        )) as InteractionData<SkillsetData>;
        const skillsetDataOld = data.data;

        if (!skillsetDataOld.skillset) {
            return;
        }
        let skillsetData = skillsetDataOld as SkillsetData<Skillset>;

        if (action === 'select' && intr.isStringSelectMenu()) {
            const [param1, param2] = intr.values[0].split('-');
            switch (param1) {
                case 'show':
                case 'hidden':
                    skillsetData.showSkill ??= {};
                    skillsetData.showSkill[param2 as SkillId] = param1 === 'show';
                    break;
                case 'skillset':
                    skillsetData = {
                        ...skillsetData,
                        ...((await fetchSkillsetData(
                            param2,
                            skillsetDataOld.level,
                            skillsetDataOld.rank,
                            skillsetDataOld.subrank
                        )) as SkillsetData<Skillset>),
                    };
                    break;
            }
        } else {
            skillsetData = {
                ...skillsetData,
                ...calcSkillsetData(
                    skillsetDataOld.skillset,
                    skillsetDataOld.constants,
                    skillsetDataOld.level,
                    skillsetDataOld.rank,
                    skillsetDataOld.subrank,
                    action
                ),
            };
        }

        skillsetData = (await checkOutOfRankLimit(skillsetData)) as SkillsetData<Skillset>;
        if (!skillsetDataOld.skillset) {
            return;
        }

        const embed = await generateSkillsetEmbed(skillsetData);
        embed.setAuthor({
            iconURL: intr.user.displayAvatarURL(),
            name: intr.user.tag,
        });
        const components = generateSkillsetComponent(intrId, skillsetData);
        await InteractionUtils.editReply(intr, {
            components,
            embeds: [embed],
        });

        data.data = skillsetData;
        data.update().catch(reason => Logger.error(reason));
    }
}
