export type EntityId = number & {__entityId: never};

let entityIdCounter = 0;

export function isEntityId(id: number): id is EntityId {
    return id > 1;
}

export function newEntityId(): EntityId {
    return ++entityIdCounter as EntityId;
}
