import config from 'config';
import { CommandInteraction, GuildMember, PermissionsBitField } from 'discord.js';
import { Command } from '../commands/command.js';
import { Permission } from '../models/enum-helpers/permission.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { FormatUtils } from './format-utils.js';
import { InteractionUtils } from './interaction-utils.js';

export class CommandUtils {
    public static async runChecks(
        command: Command,
        intr: CommandInteraction,
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
                    }),
                    true
                );
                return false;
            }
        }

        if (command.requireDev && !config.get<string[]>('developers').includes(intr.user.id)) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.devOnlyCommand', data.lang()),
                true
            );
            return false;
        }

        if (command.requireGuild && !intr.guild) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.serverOnlyCommand', data.lang()),
                true
            );
            return false;
        }

        if (
            intr.channel &&
            'permissionsFor' in intr.channel &&
            intr.client.user &&
            !intr.channel.permissionsFor(intr.client.user)?.has(command.requireClientPerms)
        ) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.missingClientPerms', data.lang(), {
                    PERMISSIONS: command.requireClientPerms
                        .map(perm => `**${Permission.Data[perm].displayName(data.lang())}**`)
                        .join(', '),
                }),
                true
            );
            return false;
        }

        // TODO: Remove "as GuildMember",  why does discord.js have intr.member as a "APIInteractionGuildMember"?
        if (intr.member && !this.hasPermission(intr.member as GuildMember, command)) {
            await InteractionUtils.send(
                intr,
                Lang.getEmbed('validationEmbeds.missingUserPerms', data.lang()),
                true
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
            member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
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
