import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    CommandInteraction,
    MessageContextMenuCommandInteraction,
    PermissionsString,
    RESTPostAPIApplicationCommandsJSONBody,
    UserContextMenuCommandInteraction,
} from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { EventData } from '../models/event-data.js';

export interface AppCommand<T extends CommandInteraction = CommandInteraction> {
    metadata: RESTPostAPIApplicationCommandsJSONBody;
    cooldown?: RateLimiter;
    deferType: CommandDeferType;
    requireDev: boolean;
    requireGuild: boolean;
    requireClientPerms: PermissionsString[];
    requireUserPerms: PermissionsString[];
    execute(intr: T, data: EventData): Promise<void>;
    autocomplete?: (intr: AutocompleteInteraction, data: EventData) => Promise<void>;
}

export enum CommandDeferType {
    PUBLIC = 'PUBLIC',
    HIDDEN = 'HIDDEN',
    NONE = 'NONE',
}

export type Command = AppCommand<ChatInputCommandInteraction>;
export type UserContextMenu = AppCommand<UserContextMenuCommandInteraction>;
export type MessageContextMenu = AppCommand<MessageContextMenuCommandInteraction>;
