import {
    ButtonInteraction,
    Message,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    SelectMenuInteraction,
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
export type SelectMenu = Component<SelectMenuInteraction>;
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
  * SelectMenuInteraction
* ModalSubmitInteraction
  * ModalMessageModalSubmitInteraction
* AutocompleteInteraction
*/
