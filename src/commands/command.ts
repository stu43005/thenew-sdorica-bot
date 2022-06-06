import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { BaseCommandInteraction, CommandInteraction, MessageContextMenuInteraction, PermissionString, UserContextMenuInteraction } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../models/event-data.js';

export interface AppCommand<T extends BaseCommandInteraction = BaseCommandInteraction> {
    metadata: RESTPostAPIApplicationCommandsJSONBody;
    cooldown?: RateLimiter;
    deferType: CommandDeferType;
    requireDev: boolean;
    requireGuild: boolean;
    requireClientPerms: PermissionString[];
    requireUserPerms: PermissionString[];
    execute(intr: T, data: EventData): Promise<void>;
}

export enum CommandDeferType {
    PUBLIC = 'PUBLIC',
    HIDDEN = 'HIDDEN',
    NONE = 'NONE',
}

export type Command = AppCommand<CommandInteraction>;
export type UserContextMenu = AppCommand<UserContextMenuInteraction>;
export type MessageContextMenu = AppCommand<MessageContextMenuInteraction>;
