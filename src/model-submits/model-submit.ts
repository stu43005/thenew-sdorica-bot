import { Message, ModalSubmitInteraction } from 'discord.js';
import { CommandDeferType } from '../commands/command.js';

import { EventData } from '../models/event-data.js';

export interface ModelSubmit {
    ids: string[];
    deferType: CommandDeferType;
    requireGuild: boolean;
    requireEmbedAuthorTag: boolean;
    execute(intr: ModalSubmitInteraction, msg: Message, data: EventData): Promise<void>;
}
