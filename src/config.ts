import {SerializationSchema} from '#/common/serialization';
import {type GameStorage} from '#/storage';

const CONFIG_VERSION = 1;
const GAME_CONFIG_KEY = 'game_config';

// TODO: Does this really bring enough value? It would've been some much simpler to just skip saving 'showBoundaries' in the storage and move this field to the game state.
export class GameConfig {
    #debugShowBoundaries = false;
    #hasUnsavedChanges = false;
    readonly schema = SerializationSchema.build()
        .field({key: 'v', type: 'number', get: () => CONFIG_VERSION})
        .field({
            key: 'b',
            type: 'boolean',
            get: () => this.#debugShowBoundaries,
            set: (value) => (this.#debugShowBoundaries = value),
        });

    get debugShowBoundaries(): boolean {
        return this.#debugShowBoundaries;
    }

    setDebugShowBoundaries(value: boolean): void {
        if (this.#debugShowBoundaries !== value) this.#hasUnsavedChanges = true;
        this.#debugShowBoundaries = value;
    }

    saveIfChanged(storage: GameStorage): void {
        if (!this.#hasUnsavedChanges) return;
        storage.set(GAME_CONFIG_KEY, this.schema.serialize());
        this.#hasUnsavedChanges = false;
    }

    load(storage: GameStorage): void {
        const data = storage.get(GAME_CONFIG_KEY);
        if (data) {
            try {
                this.schema.deserialize(data);
            } catch (e) {
                logger.error('Failed to load game config: %O', e);
            }
            this.#hasUnsavedChanges = false;
        }
    }
}
