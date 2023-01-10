import dedent from 'dedent';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageActionRowComponentBuilder,
    MessageCreateOptions,
    StringSelectMenuBuilder,
} from 'discord.js';
import fetch from 'node-fetch';
import { DiskCache } from '../utils/cache-utils.js';
import { MathUtils } from '../utils/math-utils.js';

const rankText = ['零階', '一階', '二階', '三階'];
const rankEmoji: Record<string, string> = {
    零階: '<:rank0:911207298595188786>',
    一階: '<:rank1:911207299090096188>',
    二階: '<:rank2:911207298259615765>',
    三階: '<:rank3:911207298230255627>',
    '三階+': '<:rank3:911207298230255627>+',
    '三階++': '<:rank3:911207298230255627>++',
    Alt: '<:RankAlt:911207239744901160>',
    'Alt+': '<:RankAlt:911207239744901160>+',
    'Alt++': '<:RankAlt:911207239744901160>++',
};
const slotEmoji: Record<string, string> = {
    金: '<:posG:669932449454882817>',
    黑: '<:posB:669932448888520749>',
    白: '<:posW:669932449412677632>',
};

/**
 * 技能組限制設定
 */
const rankLimits: Record<
    string,
    {
        minRank?: number;
        maxRank?: number;
        minSubrank?: number;
        maxSubrank?: number;
        up?: string;
        down?: string;
    }
> = {
    零階: {
        minRank: 2,
        maxRank: 2,
        maxSubrank: 0,
        up: '一階',
    },
    一階: {
        minRank: 3,
        maxRank: 3,
        maxSubrank: 0,
        down: '零階',
        up: '二階',
    },
    二階: {
        minRank: 4,
        maxRank: 4,
        maxSubrank: 0,
        down: '一階',
        up: '三階',
    },
    三階: {
        minRank: 5,
        maxRank: 5,
        down: '二階',
    },
    '三階+': {
        minRank: 5,
        maxRank: 5,
        minSubrank: 5,
        down: '三階',
    },
    '三階++': {
        minRank: 5,
        maxRank: 5,
        minSubrank: 10,
        down: '三階+',
    },
    'Alt+': {
        minSubrank: 5,
        down: 'Alt',
    },
    'Alt++': {
        minSubrank: 10,
        down: 'Alt+',
    },
    'Skin+': {
        minSubrank: 5,
        down: 'Skin',
    },
    'Skin++': {
        minSubrank: 10,
        down: 'Skin+',
    },
};

export type SkillId = 'S1' | 'S2' | 'S3' | 'P1' | 'A1';

export interface SkillsetData<TSkillset extends Skillset | null = Skillset | null> {
    skillset: TSkillset;
    constants: Constants;
    level: number;
    minLevel: number;
    maxLevel: number;
    rank: number;
    minRank: number;
    maxRank: number;
    subrank: number;
    minSubrank: number;
    maxSubrank: number;
    showSkill?: { [P in SkillId]?: boolean };
}

export async function fetchSkillsetData(
    skillsetModel: string,
    inputLevel?: number | null,
    inputRank?: number | null,
    inputSubrank?: number | null
): Promise<SkillsetData> {
    const [skillset, constants, heroes] = await Promise.all([
        getWikiSkillsetData(skillsetModel),
        getWikiConstants(),
        getWikiHeroesData(),
    ]);
    if (skillset) {
        // 預先處理相關技能組
        const hero = heroes.find(hero =>
            hero.skillSets.find(skillset2 => skillset2.model === skillset.model)
        );
        skillset.otherSkillsets =
            hero?.skillSets.filter(skillset2 => skillset2.model !== skillset.model) ?? [];

        // 確保使用者輸入值不超過技能組限制
        const rankLimit = rankLimits[skillset.rank];
        if (typeof inputRank === 'number') {
            if (typeof rankLimit?.maxRank === 'number')
                inputRank = Math.min(inputRank, rankLimit.maxRank);
            if (typeof rankLimit?.minRank === 'number')
                inputRank = Math.max(inputRank, rankLimit.minRank);
        }
        if (typeof inputSubrank === 'number') {
            if (typeof rankLimit?.maxSubrank === 'number')
                inputSubrank = Math.min(inputSubrank, rankLimit.maxSubrank);
            if (typeof rankLimit?.minSubrank === 'number')
                inputSubrank = Math.max(inputSubrank, rankLimit.minSubrank);
        }
    }
    return calcSkillsetData(skillset, constants, inputLevel, inputRank, inputSubrank);
}

export function calcSkillsetData<TSkillset extends Skillset | null>(
    skillset: TSkillset,
    constants: Constants,
    inputLevel?: number | null,
    inputRank?: number | null,
    inputSubrank?: number | null,
    action?: string
): SkillsetData<TSkillset> {
    const rankLimit = skillset ? rankLimits[skillset.rank] : {};
    const minLevel = 1;
    const maxLevel = constants.playerMaxLv;
    let level = MathUtils.clamp(inputLevel ?? maxLevel, minLevel, maxLevel);
    const minRank = skillset?.hero.initRank ?? 2;
    const maxRank = 5;
    let rank = MathUtils.clamp(
        inputRank ?? MathUtils.clamp(maxRank, rankLimit?.minRank, rankLimit?.maxRank),
        minRank,
        maxRank
    );
    const minSubrank = 0;
    const maxSubrank = constants.subrankMax;
    let subrank = MathUtils.clamp(
        inputSubrank ?? MathUtils.clamp(0, rankLimit?.minSubrank, rankLimit?.maxSubrank),
        minSubrank,
        maxSubrank
    );

    switch (action) {
        case 'levelup':
            if (level < maxLevel) {
                level++;
            }
            break;
        case 'leveldown':
            if (level > minLevel) {
                level--;
            }
            break;
        case 'rankup':
            if (rank < maxRank) {
                rank++;
            } else if (subrank < maxSubrank) {
                subrank++;
            }
            break;
        case 'rankdown':
            if (subrank > minSubrank) {
                subrank--;
            } else if (rank > minRank) {
                rank--;
            }
            break;
    }
    return {
        skillset,
        constants: {
            playerMaxLv: constants.playerMaxLv,
            subrankMax: constants.subrankMax,
        },
        level,
        minLevel,
        maxLevel,
        rank,
        minRank,
        maxRank,
        subrank,
        minSubrank,
        maxSubrank,
    };
}

/**
 * 判斷是否超過技能組限制，並調整技能組階級
 */
export async function checkOutOfRankLimit(
    skillsetData: SkillsetData<Skillset>
): Promise<SkillsetData<Skillset | null>> {
    const skillset = skillsetData.skillset;
    const rankLimit = skillset ? rankLimits[skillset.rank] : {};
    let toRank: string | undefined | null = null;
    if (
        (typeof rankLimit?.maxRank === 'number' && skillsetData.rank > rankLimit.maxRank) ||
        (typeof rankLimit?.maxSubrank === 'number' && skillsetData.subrank > rankLimit.maxSubrank)
    ) {
        // 超過技能組限制的上限，調升技能組階級
        toRank = rankLimit.up;
    }
    if (
        (typeof rankLimit?.minRank === 'number' && skillsetData.rank < rankLimit.minRank) ||
        (typeof rankLimit?.minSubrank === 'number' && skillsetData.subrank < rankLimit.minSubrank)
    ) {
        // 低於技能組限制的下限，調降技能組階級
        toRank = rankLimit.down;
    }
    if (toRank) {
        const toSkillset = skillset.otherSkillsets.find(skillset2 => skillset2.rank === toRank);
        if (toSkillset) {
            return await fetchSkillsetData(
                toSkillset.model,
                skillsetData.level,
                skillsetData.rank,
                skillsetData.subrank
            );
        }
    }
    return skillsetData;
}

export async function generateSkillsetEmbed({
    skillset,
    level,
    rank,
    subrank,
    showSkill,
}: SkillsetData<Skillset>): Promise<EmbedBuilder> {
    const atk = await calcStatistics(skillset.hero.atk, level, rank, subrank, 'Atk');
    const hp = await calcStatistics(skillset.hero.hp, level, rank, subrank, 'Hp');

    const embed = new EmbedBuilder();
    // embed.setThumbnail(''); // TODO: 縮圖
    embed.setTitle(
        `${slotEmoji[skillset.hero.slot] ?? `[${skillset.hero.slot}位]`}${
            rankEmoji[skillset.rank] ?? `[${skillset.rank}]`
        } ${skillset.name} ${skillset.hero.name}`
    );
    embed.setDescription(dedent`
        等級: ${level}, 階級: ${rankText[rank - 2]}, 加值: +${subrank}
    `);
    embed.addFields([
        {
            name: '🗡️ 攻擊',
            value: atk?.toString() || '-',
            inline: true,
        },
        {
            name: '❤️ 體力',
            value: hp?.toString() || '-',
            inline: true,
        },
        ...(showSkill?.S1 ? [getSkillDesc(skillset.S1, atk)] : []),
        ...(showSkill?.S2 ? [getSkillDesc(skillset.S2, atk)] : []),
        ...(showSkill?.S3 ? [getSkillDesc(skillset.S3, atk)] : []),
        ...(showSkill?.P1 ? [getSkillDesc(skillset.P1, atk)] : []),
        ...(showSkill?.A1 ? [getSkillDesc(skillset.A1, atk)] : []),
    ]);
    return embed;
}

export function generateSkillsetComponent(
    intrId: string,
    skillsetData: SkillsetData<Skillset>
): MessageCreateOptions['components'] {
    const skillset = skillsetData.skillset;
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`wikihero-select-${intrId}`)
        .setPlaceholder('Nothing selected')
        .addOptions(
            // 顯示隱藏技能說明
            ...(['S1', 'S2', 'S3', 'P1', 'A1'] as SkillId[]).map(s => ({
                label: `${skillsetData.showSkill?.[s] ? '隱藏' : '顯示'}${skillset[s].type}技能`,
                value: `${skillsetData.showSkill?.[s] ? 'hidden' : 'show'}-${s}`,
            })),
            // 列出當前設定數值可用的技能組
            ...skillset.otherSkillsets
                .filter(skillset2 => {
                    const rankLimit = rankLimits[skillset2.rank];
                    if (!rankLimit) return true;
                    if (
                        (typeof rankLimit.maxRank !== 'number' ||
                            skillsetData.rank <= rankLimit.maxRank) &&
                        (typeof rankLimit.minRank !== 'number' ||
                            skillsetData.rank >= rankLimit.minRank) &&
                        (typeof rankLimit.maxSubrank !== 'number' ||
                            skillsetData.subrank <= rankLimit.maxSubrank) &&
                        (typeof rankLimit.minSubrank !== 'number' ||
                            skillsetData.subrank >= rankLimit.minSubrank)
                    )
                        return true;
                    // if (skillset2.rank.includes(skillset.rank.replace(/\+/g, ''))) return true;
                    return false;
                })
                .map(skillset2 => ({
                    label: `選擇技能組：${skillset2.rank} ${skillset2.name}`,
                    value: `skillset-${skillset2.model}`,
                }))
        );
    return [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`wikihero-levelup-${intrId}`)
                .setEmoji('⬆')
                .setLabel('提高等級')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(skillsetData.level >= skillsetData.maxLevel),
            new ButtonBuilder()
                .setCustomId(`wikihero-leveldown-${intrId}`)
                .setEmoji('⬇')
                .setLabel('降低等級')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(skillsetData.level <= skillsetData.minLevel),
            new ButtonBuilder()
                .setCustomId(`wikihero-rankup-${intrId}`)
                .setEmoji('➕')
                .setLabel('提高階級')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(
                    skillsetData.rank >= skillsetData.maxRank &&
                        skillsetData.subrank >= skillsetData.maxSubrank
                ),
            new ButtonBuilder()
                .setCustomId(`wikihero-rankdown-${intrId}`)
                .setEmoji('➖')
                .setLabel('降低階級')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(
                    skillsetData.rank <= skillsetData.minRank &&
                        skillsetData.subrank <= skillsetData.minSubrank
                )
        ),
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(menu),
    ];
}

function getSkillDesc(skill: Skill, atk: number): { name: string; value: string } {
    const name =
        `${skill.name} (${skill.type}${skill.shape})` +
        (skill.triggerLimit ? '【觸發限制】' : '') +
        (skill.counterAttackLimit ? '【反擊限制】' : '');
    const desc = skill.info.replace(/\(\$ATK:([\d.]+)\)/g, (match, p1) => {
        const n = Number(p1);
        return `(💥${Math.floor(MathUtils.multiply(n, atk))})`;
    });
    return {
        name,
        value: desc,
    };
}

async function calcStatistics(
    base: number,
    level: number,
    rank: number,
    subrank: number,
    type: 'Hp' | 'Atk'
): Promise<number> {
    const levelUps = await getWikiLevelUps();
    const levelMultiple = levelUps[`level${type}`][level - 1];
    const rankMultiple = levelUps[`rank${type}`][rank - 1];
    const subrankMultiple = subrank === 0 ? 1 : levelUps[`subrank${type}`][subrank - 1];
    return Math.floor(
        MathUtils.multiply(
            MathUtils.multiply(base, levelMultiple),
            MathUtils.multiply(rankMultiple, subrankMultiple)
        )
    );
}

export interface Skill {
    name: string;
    type: string;
    shape: string;
    info: string;
    triggerLimit: string;
    counterAttackLimit: boolean;
    unlockRank?: string;
}

export interface Skillset {
    id: string;
    type: string;
    model: string;
    name: string;
    rank: string;
    revive: number;

    S1: Skill;
    S2: Skill;
    S3: Skill;
    P1: Skill;
    A1: Skill;

    hero: {
        id: string;
        model: string;
        fullname: string;
        name: string;
        atk: number;
        hp: number;
        slot: string;
        initRank: number;
    };
    otherSkillsets: HeroSkillset[];
}

export async function getWikiSkillsetData(skillsetModel: string): Promise<Skillset | null> {
    return await DiskCache.wrap(`WikiSkillsetData-${skillsetModel}`, async () => {
        try {
            const resp = await fetch(
                `https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/Heroes/${skillsetModel}.json`
            );
            return (await resp.json()) as Skillset;
        } catch (error) {
            return null;
        }
    });
}

export interface Hero {
    id: string;
    model: string;
    slot: string;
    fullname: string;
    name: string;
    scName: string;
    enName: string;
    initRank: number;
    atk: number;
    hp: number;
    revive: number;
    enable: boolean;
    skillSets: HeroSkillset[];
}

export interface HeroSkillset {
    id: string;
    type: string;
    model: string;
    name: string;
    rank: string;
}

export async function getWikiHeroesData(): Promise<Hero[]> {
    return await DiskCache.wrap('WikiHeroesData', async () => {
        const resp = await fetch(
            'https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/Heroes.json'
        );
        return (await resp.json()) as Hero[];
    });
}

export function heroFilter(input: string): (hero: Hero) => boolean {
    input = input.toLowerCase();
    const skillsetMatcher = skillsetFilter(input);
    return (hero: Hero) => {
        if (!hero.name) return false;
        if (hero.name.toLowerCase().includes(input)) return true;
        if (hero.scName.toLowerCase().includes(input)) return true;
        if (hero.enName.toLowerCase().includes(input)) return true;
        if (hero.model.includes(input)) return true;
        if (hero.skillSets.find(skillsetMatcher)) return true;
        const alias = [
            ...(charAlias[hero.name] ?? []),
            ...(hero.name.endsWith('SP') || hero.name.endsWith('MZ')
                ? charAlias[hero.name.substring(0, hero.name.length - 2)] ?? []
                : []),
        ];
        if (alias.find(name => name.toLowerCase().includes(input))) return true;
        return false;
    };
}

export function skillsetFilter(input: string): (skillset: HeroSkillset) => boolean {
    input = input.toLowerCase();
    return (skillset: HeroSkillset) => {
        if (!skillset.name) return false;
        if (skillset.name.toLowerCase().includes(input)) return true;
        if (skillset.model.includes(input)) return true;
        if (skillset.rank.includes(input)) return true;
        if (skillsetAlias[skillset.name]?.find(name => name.toLowerCase().includes(input)))
            return true;
        return false;
    };
}

export interface LevelUps {
    levelAtk: number[];
    levelHp: number[];
    rankAtk: number[];
    rankHp: number[];
    subrankAtk: number[];
    subrankHp: number[];
}

export async function getWikiLevelUps(): Promise<LevelUps> {
    return await DiskCache.wrap('WikiLevelUps', async () => {
        const resp = await fetch(
            'https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/LevelUps.json'
        );
        return (await resp.json()) as LevelUps;
    });
}

export type Constants = Record<string, number> & {
    playerMaxLv: number;
    subrankMax: number;
};

export async function getWikiConstants(): Promise<Constants> {
    return await DiskCache.wrap('WikiConstants', async () => {
        const resp = await fetch(
            'https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/Constants.json'
        );
        return (await resp.json()) as Constants;
    });
}

export const charAlias: Record<string, string[]> = Object.freeze({
    'NEKO＃ΦωΦ': ['NEKO#ΦωΦ'],
    Ivy: ['lvy'],
    黯月: ['暗月', '闇月', '按月', '案月'],
    蠢熊勇士: ['蠢雄勇士', '傻氣男友', '巨槌'],
    蘇菲: ['團長'],
    麗莎SP: ['lolisa'],
    麗莎: ['lisa'],
    龐SP: ['黑龐'],
    黛安娜: ['戴安娜', '女王'],
    戴菲斯: ['老蛇'],
    璃SP: ['熊璃'],
    璃: ['離', 'leah'],
    瑪莉亞: ['瑪麗亞', '玛丽亚'],
    實驗體: ['敷符'],
    愛麗絲: ['小女孩'],
    奧斯塔: ['醫生'],
    雅辛托斯SP: ['忍者阿辛'],
    雅辛托斯: ['阿辛'],
    普吉: ['puggi'],
    揚波: ['楊波'],
    傑羅姆SP: ['假面騎士'],
    傑羅姆: ['小帥哥', '副官'],
    莫里斯: ['莫裡斯'],
    荷絲緹雅: ['人魚', '赫斯緹亞'],
    梨花: ['水母'],
    納杰爾: ['nj2', '納傑爾', '納捷爾', '羊角'],
    娜雅: ['娜亞'],
    夏爾SP: ['C4'],
    夏爾: ['院長'],
    面具小姐: ['面具女孩', 'Celia'],
    迪蘭SP: ['dlsp'],
    迪蘭: ['辣個男人', '狄蘭', 'dl'],
    泉: ['一隻米', 'izumi'],
    勇鉉: ['勇弦'],
    芙蕾莉卡: ['芙雷利卡', '奶子', '路希翁', '將軍'],
    法蒂瑪: ['豹姐'],
    卷雲: ['捲雲'],
    希歐: ['co', '西歐'],
    艾利歐: ['小天使'],
    米莎: ['misa', '小蛇', '米沙'],
    安潔莉亞SP: ['公主SP', '安潔SP'],
    安潔莉亞: ['公主'],
    吉哈薩哈: ['吉哈哈哈哈哈', '二哈'],
});

export const skillsetAlias: Record<string, string[]> = Object.freeze({
    白晝殺手: ['白暗月', '白闇月', '白按月', '白案月'],
    旭日大師: ['白龐'],
    誅心深算: ['紅奧'],
    冒險紳士: ['黑普吉'],
    至黑之盾: ['黑迪蘭', '黑狄蘭'],
});
