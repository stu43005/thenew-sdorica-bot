import {
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
    type CommandInteraction,
    type MessageContextMenuCommandInteraction,
    type PermissionsString,
    type RESTPostAPIApplicationCommandsJSONBody,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
    type RESTPostAPIContextMenuApplicationCommandsJSONBody,
    type UserContextMenuCommandInteraction,
} from 'discord.js';
import { type RateLimiter } from 'discord.js-rate-limiter';
import { type EventData } from '../models/event-data.js';

export interface AppCommand<
    Intr extends CommandInteraction = CommandInteraction,
    Meta extends RESTPostAPIApplicationCommandsJSONBody = RESTPostAPIApplicationCommandsJSONBody,
> {
    metadata: Meta;
    cooldown?: RateLimiter;
    deferType: CommandDeferType;
    requireDev: boolean;
    requireGuild: boolean;
    requireClientPerms: PermissionsString[];
    requireUserPerms: PermissionsString[];
    execute(intr: Intr, data: EventData): Promise<void>;
    autocomplete?: (intr: AutocompleteInteraction, data: EventData) => Promise<void>;
}

export enum CommandDeferType {
    PUBLIC = 'PUBLIC',
    HIDDEN = 'HIDDEN',
    NONE = 'NONE',
}

export type Command = AppCommand<
    ChatInputCommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody
>;
export type UserContextMenu = AppCommand<
    UserContextMenuCommandInteraction,
    RESTPostAPIContextMenuApplicationCommandsJSONBody
>;
export type MessageContextMenu = AppCommand<
    MessageContextMenuCommandInteraction,
    RESTPostAPIContextMenuApplicationCommandsJSONBody
>;
