import { Interaction } from 'discord.js';
import { Collection, CustomRepository, getRepository } from 'fireorm';
import { CustomBaseRepository } from './base-repository.js';

@Collection()
export class InteractionData<DataType = unknown> {
    id!: string;
    time!: string;
    guildId!: string | null;
    guildName!: string | null;
    channelId!: string;
    channelName!: string;
    userId!: string;
    userTag!: string;
    command!: string;
    data!: DataType;

    public fillInteraction(intr: Interaction): void {
        this.id = intr.id;
        this.time = intr.createdAt.toISOString();
        this.guildId = intr.guildId;
        this.guildName = intr.guild?.name ?? null;
        this.channelId = intr.channelId ?? '';
        this.channelName =
            intr.channel && 'name' in intr.channel ? intr.channel.name : intr.user.username;
        this.userId = intr.user.id;
        this.userTag = intr.user.username;
        if (intr.isCommand()) {
            this.command = intr.commandName;
        }
    }

    public async update(): Promise<InteractionData<DataType>> {
        return (await getInteractionDataRepository().update(this)) as InteractionData<DataType>;
    }
}

@CustomRepository(InteractionData)
export class CustomInteractionDataRepository extends CustomBaseRepository<InteractionData> {}

export function getInteractionDataRepository(): CustomInteractionDataRepository {
    return getRepository(InteractionData) as CustomInteractionDataRepository;
}
