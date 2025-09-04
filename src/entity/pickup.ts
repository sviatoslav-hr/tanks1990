import {CELL_SIZE} from '#/const';
import {Entity, findIntersectingAmong, isIntesecting} from '#/entity/core';
import {type Tank} from '#/entity/tank';
import {
    DAMAGE_INCREASE_MULT,
    RELOAD_INCREASE_MULT,
    RESTORE_HP_AMOUNT,
    SHIELD_PICKUP_DURATION,
    SPEED_INCREASE_MULT,
} from '#/entity/tank/generation';
import {Rect, scaleRectCentered} from '#/math';
import {random} from '#/math/rng';
import {Renderer} from '#/renderer';
import {Sprite} from '#/renderer/sprite';
import {GameState} from '#/state';
import {Room} from '#/world/room';

export enum PickupType {
    REPAIR = 'repair',
    RELOAD_BOOST = 'reload-boost',
    SHIELD = 'shield',
    DAMAGE_BOOST = 'damage-boost',
    SPEED_BOOST = 'speed-boost',
}

const allPickupTypes = [
    PickupType.REPAIR,
    PickupType.RELOAD_BOOST,
    PickupType.SHIELD,
    PickupType.DAMAGE_BOOST,
    PickupType.SPEED_BOOST,
];

const PICKUP_SIZE = CELL_SIZE * 0.5;
const PICKUP_SPRITE_SCALE = 0.7;

export class Pickup extends Entity {
    readonly type: PickupType;
    readonly sprite: Sprite<string>;
    readonly spriteRect: Rect;
    readonly frameIndex: number;

    constructor(type: PickupType, x: number, y: number) {
        super();
        this.type = type;
        this.dead = false; // NOTE: Basically alias for "collected" state.
        this.x = x;
        this.y = y;
        this.width = PICKUP_SIZE;
        this.height = PICKUP_SIZE;
        this.spriteRect = scaleRectCentered(this, PICKUP_SPRITE_SCALE);
        this.sprite = new Sprite({
            key: 'pickups',
            frameWidth: 275,
            frameHeight: 275,
            states: [{name: 'anim', frames: allPickupTypes.length}],
        });
        this.frameIndex = allPickupTypes.findIndex((t) => t === type);
        this.sprite.selectFrame(this.frameIndex);
    }
}
const pickupColors: Record<PickupType, string> = {
    [PickupType.REPAIR]: '#00ff00',
    [PickupType.SHIELD]: '#00ffff',
    [PickupType.SPEED_BOOST]: '#ffffff',
    [PickupType.DAMAGE_BOOST]: '#ff0000',
    [PickupType.RELOAD_BOOST]: '#ffc107',
};

export function drawPickups(renderer: Renderer, pickups: Pickup[]): void {
    const bgOpacity = Math.round(0.33 * 255).toString(16);
    for (const pickup of pickups) {
        if (pickup.dead) continue;
        const color = pickupColors[pickup.type];
        renderer.setFillColor(color + bgOpacity);
        renderer.fillRect2(pickup);
        renderer.setStrokeColor(color);
        renderer.strokeBoundary(pickup, 2);
        pickup.sprite.draw(renderer, pickup.spriteRect);
    }
}

export function simulatePickups(state: GameState): void {
    const room = state.world.activeRoom;
    // NOTE: Iterate through all pickups in the room and apply them to the player.
    for (const tank of state.tanks) {
        if (tank.dead) continue;
        for (const pickup of room.pickups) {
            if (pickup.dead) continue;
            if (isIntesecting(pickup, tank)) {
                applyPickup(pickup, tank);
                break;
            }
        }
    }
}

function applyPickup(pickup: Pickup, tank: Tank): void {
    assert(!tank.dead);
    let skipped = false;
    switch (pickup.type) {
        case PickupType.REPAIR:
            if (tank.needsHealing) {
                tank.restoreHealthAmount(RESTORE_HP_AMOUNT);
            } else {
                skipped = true;
            }
            break;
        case PickupType.SHIELD:
            // NOTE: If tank already has shield, prolong it instead of overwriting.
            tank.activateShield(SHIELD_PICKUP_DURATION);
            break;
        case PickupType.SPEED_BOOST:
            tank.speedMult += SPEED_INCREASE_MULT;
            break;
        case PickupType.DAMAGE_BOOST:
            tank.damageMult += DAMAGE_INCREASE_MULT;
            break;
        case PickupType.RELOAD_BOOST:
            tank.reloadMult += RELOAD_INCREASE_MULT;
            break;

        default:
            assert(false);
    }
    if (!skipped) pickup.dead = true;
}

export function generatePickups(room: Room, state: GameState): void {
    // NOTE: Offset by one cell from the edge to prevent immediate intersection other entities on spawn.
    const minX = room.boundary.x + CELL_SIZE * 2;
    const minY = room.boundary.y + CELL_SIZE * 2;
    const maxX = room.boundary.x + room.boundary.width - CELL_SIZE * 2;
    const maxY = room.boundary.y + room.boundary.height - CELL_SIZE * 2;
    const minXRel = minX / CELL_SIZE;
    const minYRel = minY / CELL_SIZE;
    const maxXRel = maxX / CELL_SIZE;
    const maxYRel = maxY / CELL_SIZE;

    const selectedPickups = random.selectMany(allPickupTypes, 3, allPickupTypes.length);

    let pickupType: PickupType | undefined;
    const offset = (CELL_SIZE - PICKUP_SIZE) / 2;
    const testRect: Rect = {x: 0, y: 0, width: PICKUP_SIZE, height: PICKUP_SIZE};
    let iterations = 0;
    // TODO: Add iterations limit to prevent infinite loops.
    while ((pickupType = selectedPickups[0])) {
        iterations += 1;
        // Use relative positions to place pickups exactly in the grid.
        const xRel = random.int32Range(minXRel, maxXRel);
        const yRel = random.int32Range(minYRel, maxYRel);
        testRect.x = xRel * CELL_SIZE + offset;
        testRect.y = yRel * CELL_SIZE + offset;

        if (isIntesecting(testRect, state.player)) continue;
        if (findIntersectingAmong(testRect, room.blocks)) continue;
        if (findIntersectingAmong(testRect, room.pickups)) continue;

        const pickup = new Pickup(pickupType, testRect.x, testRect.y);
        room.pickups.push(pickup);
        selectedPickups.shift();
    }
}
