import { CustomEvent } from './custom-event.js';
import { SdoricaCheckMember } from './sdorica-check-member.js';
import { StatMemberAdd } from './stat-member-add.js';
import { StatMemberRemove } from './stat-member-remove.js';
import { StatMessage } from './stat-message.js';
import { StatReaction } from './stat-reaction.js';

export const customEvents: CustomEvent<any>[] = [
    new SdoricaCheckMember(),
    new StatMemberAdd(),
    new StatMemberRemove(),
    new StatMessage(),
    new StatReaction(),
];
