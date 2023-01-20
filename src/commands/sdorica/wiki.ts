import {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import {
    getInteractionDataRepository,
    InteractionData,
} from '../../database/entities/interaction.js';
import { Logger } from '../../services/logger.js';
import {
    fetchSkillsetData,
    generateSkillsetComponent,
    generateSkillsetEmbed,
    getWikiHeroesData,
    heroFilter,
    Skillset,
    SkillsetData,
    skillsetFilter,
} from '../../services/wiki.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class WikiCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('wiki')
        .setDescription('提供查詢萬象物語資料')
        .addSubcommand(builder =>
            builder
                .setName('hero')
                .setDescription('查詢萬象物語角色基本資料')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('角色名稱階級')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption(option =>
                    option.setName('level').setDescription('等級 (預設: 最高等級)').setMinValue(1)
                )
                .addIntegerOption(option =>
                    option.setName('rank').setDescription('階級 (預設: 三階)').setChoices(
                        {
                            name: '三階-金',
                            value: 5,
                        },
                        {
                            name: '二階-紫',
                            value: 4,
                        },
                        {
                            name: '一階-藍',
                            value: 3,
                        },
                        {
                            name: '零階-白',
                            value: 2,
                        }
                    )
                )
                .addIntegerOption(option =>
                    option.setName('subrank').setDescription('加值 (預設: +0)').setMinValue(0)
                )
        )
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        switch (intr.options.getSubcommand()) {
            case 'hero':
                await this.executeHeroCommand(intr);
                break;
        }
    }

    private async executeHeroCommand(intr: ChatInputCommandInteraction): Promise<void> {
        const skillsetModel = intr.options.getString('name', true);
        const inputLevel = intr.options.getInteger('level');
        const inputRank = intr.options.getInteger('rank');
        const inputSubrank = intr.options.getInteger('subrank');

        const skillsetData = (await fetchSkillsetData(
            skillsetModel,
            inputLevel,
            inputRank,
            inputSubrank
        )) as SkillsetData<Skillset>;
        if (!skillsetData.skillset) {
            const embed = new EmbedBuilder();
            embed.setColor(0xfe8082);
            embed.setDescription(`❌錯誤：找不到角色資料`);
            await InteractionUtils.send(intr, embed);
            return;
        }

        const embed = await generateSkillsetEmbed(skillsetData);
        embed.setAuthor({
            iconURL: intr.user.displayAvatarURL(),
            name: intr.user.tag,
        });
        const components = generateSkillsetComponent(intr.id, skillsetData);
        await InteractionUtils.send(intr, {
            components,
            embeds: [embed],
        });

        const data = new InteractionData<SkillsetData>();
        data.fillInteraction(intr);
        data.data = skillsetData;
        getInteractionDataRepository()
            .create(data)
            .catch(reason => Logger.error(reason));
    }

    public async autocomplete(intr: AutocompleteInteraction): Promise<void> {
        let choices: ApplicationCommandOptionChoiceData[] = [];
        const focused = intr.options.getFocused(true);
        switch (intr.options.getSubcommand()) {
            case 'hero':
                switch (focused.name) {
                    case 'name': {
                        if (!focused.value) {
                            getWikiHeroesData().catch(reason => Logger.error(reason));
                            break;
                        }
                        choices = await this.autocompleteSkillsetName(focused.value);
                        break;
                    }
                }
                break;
        }
        Logger.debug(`choices length: ${choices.length}`);
        await intr.respond(choices.slice(0, 25));
    }

    private async autocompleteHeroName(
        input: string
    ): Promise<ApplicationCommandOptionChoiceData[]> {
        const heroes = await getWikiHeroesData();
        const choices: ApplicationCommandOptionChoiceData[] = heroes
            .filter(heroFilter(input))
            .map(hero => ({
                name: hero.name,
                value: hero.name,
            }));
        return choices;
    }

    private async autocompleteSkillsetName(
        input: string,
        heroName?: string | null
    ): Promise<ApplicationCommandOptionChoiceData[]> {
        const heroes = await getWikiHeroesData();
        if (heroName) {
            const choices: ApplicationCommandOptionChoiceData[] = heroes
                .filter(hero => hero.name === heroName)
                .map(hero =>
                    hero.skillSets.filter(skillsetFilter(input)).map(skillset => ({
                        name: heroName
                            ? `${skillset.rank} ${skillset.name}`
                            : `${hero.name} ${skillset.rank} ${skillset.name}`,
                        value: skillset.model,
                    }))
                )
                .flat();
            return choices;
        } else {
            const choices: ApplicationCommandOptionChoiceData[] = heroes
                .filter(heroFilter(input))
                .map(hero =>
                    hero.skillSets.map(skillset => ({
                        name: heroName
                            ? `${skillset.rank} ${skillset.name}`
                            : `${hero.name} ${skillset.rank} ${skillset.name}`,
                        value: skillset.model,
                    }))
                )
                .flat();
            return choices;
        }
    }
}
