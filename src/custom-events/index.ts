import { CustomEvent } from './custom-event.js';
import { SdoricaCheckMember } from './sdorica-check-member.js';

export const customEvents: CustomEvent<any>[] = [new SdoricaCheckMember()];
