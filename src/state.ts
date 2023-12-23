import { Tank } from "./entity";
import { Entity } from "./entity/core";

export class State {
    static tanks: Tank[] = [];

    static get entities(): Entity[] {
        const entities: Entity[] = [];
        for (const t of this.tanks) {
            entities.push(t, ...t.projectiles);
        }
        return entities;
    }
}

Object.assign(window, { state: State });
