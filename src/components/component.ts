import {
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    Message,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction,
} from 'discord.js';
import { CommandDeferType } from '../commands/command.js';
import { EventData } from '../models/event-data.js';

export type ComponentIntercation = MessageComponentInteraction | ModalSubmitInteraction;
export type ComponentDeferType<T extends ComponentIntercation> =
    T extends MessageComponentInteraction
        ? MessageComponentDeferType
        : T extends ModalSubmitInteraction
          ? CommandDeferType
          : MessageComponentDeferType | CommandDeferType;

export interface Component<T extends ComponentIntercation = ComponentIntercation> {
    ids: string[];
    deferType: ComponentDeferType<T>;
    requireGuild: boolean;
    requireEmbedAuthorTag: boolean;
    execute(intr: T, msg: Message, data: EventData): Promise<void>;
}

export enum MessageComponentDeferType {
    REPLY = 'REPLY',
    UPDATE = 'UPDATE',
    NONE = 'NONE',
}

export type Button = Component<ButtonInteraction>;
export type StringSelectMenu = Component<StringSelectMenuInteraction>;
export type UserSelectMenu = Component<UserSelectMenuInteraction>;
export type RoleSelectMenu = Component<RoleSelectMenuInteraction>;
export type MentionableSelectMenu = Component<MentionableSelectMenuInteraction>;
export type ChannelSelectMenu = Component<ChannelSelectMenuInteraction>;
export type ModelSubmit = Component<ModalSubmitInteraction>;

/*
BaseInteraction
* CommandInteraction
    * ChatInputCommandInteraction
    * ContextMenuCommandInteraction
        * UserContextMenuCommandInteraction
        * MessageContextMenuCommandInteraction
* MessageComponentInteraction
    * ButtonInteraction
    * (AnySelectMenuInteraction)
        * StringSelectMenuInteraction
        * UserSelectMenuInteraction
        * RoleSelectMenuInteraction
        * MentionableSelectMenuInteraction
        * ChannelSelectMenuInteraction
* ModalSubmitInteraction
    * ModalMessageModalSubmitInteraction
* AutocompleteInteraction
*/
