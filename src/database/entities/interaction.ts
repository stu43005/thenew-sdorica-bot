import { Collection, CustomRepository, getRepository } from 'fireorm';
import { CustomBaseRepository } from './base-repository.js';

@Collection()
export class InteractionData<DataType = unknown> {
    id!: string;
    time!: string;
    guildId!: string | null;
    channelId!: string;
    userId!: string;
    command!: string;
    data!: DataType;

    public async update(): Promise<InteractionData<DataType>> {
        return (await getInteractionDataRepository().update(this)) as InteractionData<DataType>;
    }
}

@CustomRepository(InteractionData)
export class CustomInteractionDataRepository extends CustomBaseRepository<InteractionData> {}

export function getInteractionDataRepository(): CustomInteractionDataRepository {
    return getRepository(InteractionData) as CustomInteractionDataRepository;
}
