import { channelMention } from '@discordjs/builders';
import { ChatInputApplicationCommandData, CommandInteraction, PermissionString } from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class AutoCrosspostingCommand implements Command {
	public metadata: ChatInputApplicationCommandData = {
		name: 'auto-crossposting',
		description: '設定自動發佈貼文(必須是公告頻道)',
	};
	public deferType = CommandDeferType.HIDDEN;
	public requireDev = false;
	public requireGuild = true;
	public requireClientPerms: PermissionString[] = [];
	public requireUserPerms: PermissionString[] = ['MANAGE_GUILD'];

	public async execute(intr: CommandInteraction, data: EventData): Promise<void> {
		if (!intr.guild || !data.guild) return;

		let action: 'add' | 'remove' = 'add';
		const autoCrossposting = data.guild.autoCrossposting ?? [];
		const index = autoCrossposting.indexOf(intr.channelId);
		if (~index) {
			autoCrossposting.splice(index, 1);
			action = 'remove';
		} else {
			autoCrossposting.push(intr.channelId);
			action = 'add';
		}
		data.guild.autoCrossposting = autoCrossposting;
		await data.guild.update();

		await InteractionUtils.send(intr, channelMention(intr.channelId) + (action === 'add' ? ' 將不會自動發佈貼文' : ' 將會自動發佈貼文'), true);
	}
}
