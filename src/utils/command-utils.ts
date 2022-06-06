import config from 'config';
import { BaseCommandInteraction, GuildChannel, GuildMember, Permissions } from 'discord.js';
import { Command } from '../commands/command.js';
import { Permission } from '../models/enum-helpers/index.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/index.js';
import { FormatUtils, InteractionUtils } from './index.js';

export class CommandUtils {
    public static async runChecks(
        command: Command,
        intr: BaseCommandInteraction,
        data: EventData
    ): Promise<boolean> {
        if (command.cooldown) {
            const limited = command.cooldown.take(intr.user.id);
            if (limited) {
                await InteractionUtils.send(
                    intr,
                    Lang.getEmbed('validationEmbeds.cooldownHit', data.lang(), {
                        AMOUNT: command.cooldown.amount.toLocaleString(),
                        INTERVAL: FormatUtils.duration(command.cooldown.interval, data.lang()),
                    })
                );
                return false;
            }
        }

        if (command.requireDev && !config.get<string[]>('developers').includes(intr.user.id)) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.devOnlyCommand', data.lang())
            );
            return false;
        }

        if (command.requireGuild && !intr.guild) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.serverOnlyCommand', data.lang())
            );
            return false;
        }

        if (
            intr.channel instanceof GuildChannel &&
            intr.client.user &&
            !intr.channel.permissionsFor(intr.client.user)?.has(command.requireClientPerms)
        ) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.missingClientPerms', data.lang(), {
                    PERMISSIONS: command.requireClientPerms
                        .map(perm => `**${Permission.Data[perm].displayName(data.lang())}**`)
                        .join(', '),
                })
            );
            return false;
        }

        // TODO: Remove "as GuildMember",  why does discord.js have intr.member as a "APIInteractionGuildMember"?
        if (intr.member && !this.hasPermission(intr.member as GuildMember, command)) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.missingUserPerms', data.lang())
            );
            return false;
        }

        return true;
    }

    private static hasPermission(member: GuildMember, command: Command): boolean {
        // Debug option to bypass permission checks
        if (config.get('debug.skip.checkPerms')) {
            return true;
        }

        // Developers, server owners, and members with "Manage Server" have permission for all commands
        if (
            member.guild.ownerId === member.id ||
            member.permissions.has(Permissions.FLAGS.MANAGE_GUILD) ||
            config.get<string[]>('developers').includes(member.id)
        ) {
            return true;
        }

        // Check if member has required permissions for command
        if (!member.permissions.has(command.requireUserPerms)) {
            return false;
        }

        return true;
    }
}
