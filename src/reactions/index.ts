import { AutoPinReaction } from './autopin.js';
import { AutoUnpinReaction } from './autounpin.js';
import { ReactionRoleAdd } from './reaction-role-add.js';
import { ReactionRoleRemove } from './reaction-role-remove.js';
import { Reaction } from './reaction.js';
import { StarboardReaction } from './starboard.js';

export { Reaction } from './reaction.js';

export const reactions: Reaction[] = [
    new AutoPinReaction(),
    new AutoUnpinReaction(),
    new ReactionRoleAdd(),
    new ReactionRoleRemove(),
    new StarboardReaction(),
];
