import {SerializationSchema} from '#/common/serialization';
import {GameStorage} from '#/storage';

const CONFIG_VERSION = 1;
const GAME_CONFIG_KEY = 'game_config';

export class GameConfig {
    // TODO: This should be split into multiple configs since it's responsible for too much right now.
    #debugShowBoundaries = false;
    #configChanged = false;
    readonly schema = SerializationSchema.build()
        .field({key: 'v', type: 'number', get: () => CONFIG_VERSION})
        .field({
            key: 'b',
            type: 'boolean',
            get: () => this.#debugShowBoundaries,
            set: (value) => (this.#debugShowBoundaries = value),
        });

    constructor(private readonly storage: GameStorage) {}

    get debugShowBoundaries(): boolean {
        return this.#debugShowBoundaries;
    }

    get changed(): boolean {
        return this.#configChanged;
    }

    setDebugShowBoundaries(value: boolean): void {
        if (this.#debugShowBoundaries !== value) this.#configChanged = true;
        this.#debugShowBoundaries = value;
    }

    // TODO: Should it just own storage?
    save(): void {
        assert(this.#configChanged);
        this.storage.set(GAME_CONFIG_KEY, this.schema.serialize());
        this.#configChanged = false;
    }

    load(): void {
        const data = this.storage.get(GAME_CONFIG_KEY);
        if (data) {
            try {
                this.schema.deserialize(data);
            } catch (e) {
                logger.error('Failed to load game config: %O', e);
            }
            this.#configChanged = false;
        }
    }
}
