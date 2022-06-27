import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Permissions, PermissionString } from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class AutoPinCommand implements Command {
	public metadata = new SlashCommandBuilder()
		.setName('autopin')
		.setDescription('設定自動釘選所需📌的數量')
		.addIntegerOption((builder) => builder
			.setName('count')
			.setDescription('自動釘選所需的數量')
			.setRequired(false))
		.setDMPermission(false)
		.setDefaultMemberPermissions(new Permissions()
			.add('MANAGE_GUILD')
			.valueOf())
		.toJSON();
	public deferType = CommandDeferType.HIDDEN;
	public requireDev = false;
	public requireGuild = true;
	public requireClientPerms: PermissionString[] = [];
	public requireUserPerms: PermissionString[] = ['MANAGE_GUILD'];

	public async execute(intr: CommandInteraction, data: EventData): Promise<void> {
		if (!intr.guild || !data.guild) return;

		const count = intr.options.getInteger('count');
		let autopinCount = data.guild.autopinCount;
		if (typeof count === 'number') {
			data.guild.autopinCount = autopinCount = count;
			await data.guild.update();
		}

		await InteractionUtils.send(intr, `目前自動釘選所需📌的數量為：${autopinCount ?? 0}`, true);
	}
}
