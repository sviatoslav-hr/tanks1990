import {CELL_SIZE} from '#/const';
import {Entity, findIntersectingAmong, isIntesecting} from '#/entity/core';
import {EntityManager} from '#/entity/manager';
import {type Tank} from '#/entity/tank';
import {
    DAMAGE_INCREASE_MULT,
    RESTORE_HP_AMOUNT,
    SHIELD_PICKUP_DURATION,
    SPEED_INCREASE_MULT,
} from '#/entity/tank/generation';
import {Rect} from '#/math';
import {random} from '#/math/rng';
import {Renderer} from '#/renderer';
import {Room} from '#/world/room';

export enum PickupType {
    HEATH_RESTORE = 'health-restore',
    SHIELD = 'shield',
    SPEED_BOOST = 'speed-boost',
    DAMAGE_BOOST = 'damage-boost',
}

const PICKUP_SIZE = CELL_SIZE * 0.5;

export class Pickup extends Entity {
    readonly type: PickupType;

    constructor(type: PickupType) {
        super();
        this.type = type;
        this.dead = false;
        this.x = 0;
        this.y = 0;
        this.width = PICKUP_SIZE;
        this.height = PICKUP_SIZE;
    }
}
const pickupColors: Record<PickupType, string> = {
    [PickupType.HEATH_RESTORE]: '#00ff00',
    [PickupType.SHIELD]: '#00ffff',
    [PickupType.SPEED_BOOST]: '#ffffff',
    [PickupType.DAMAGE_BOOST]: '#ff0000',
};

const pickupTexts: Record<PickupType, string> = {
    [PickupType.HEATH_RESTORE]: '+HP',
    [PickupType.SHIELD]: 'Shield',
    [PickupType.SPEED_BOOST]: '+SPD',
    [PickupType.DAMAGE_BOOST]: '+DMG',
};

export function drawPickups(renderer: Renderer, pickups: Pickup[]): void {
    for (const pickup of pickups) {
        if (pickup.dead) continue;
        const color = pickupColors[pickup.type];
        renderer.setFillColor(color + '54'); // 33% opacity
        renderer.fillRect2(pickup);
        renderer.setStrokeColor(color);
        renderer.strokeBoundary(pickup, 2);
        const code = pickupTexts[pickup.type];
        renderer.setFont('bold 16px sans-serif');
        const metrics = renderer.measureText(code);
        const scale = renderer.camera.scale;
        renderer.fillText(code, {
            x: pickup.x + (pickup.width - metrics.width / scale) / 2,
            y:
                pickup.y +
                pickup.height / 2 +
                (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 / scale,
            color: color,
        });
    }
}

export function simulatePickups(manager: EntityManager): void {
    const room = manager.world.activeRoom;
    // NOTE: Iterate through all pickups in the room and apply them to the player.
    for (const tank of manager.tanks) {
        if (tank.dead) continue;
        for (const pickup of room.pickups) {
            if (pickup.dead) continue;
            if (isIntesecting(pickup, tank)) {
                applyPickup(pickup, tank);
                logger.debug('Pickup %s applied to tank', pickup.type, tank.id);
            }
        }
    }
}

function applyPickup(pickup: Pickup, tank: Tank): void {
    assert(!tank.dead);
    switch (pickup.type) {
        case PickupType.HEATH_RESTORE:
            logger.debug('Restoring health for tank %s', tank.id);
            tank.restoreHealthAmount(RESTORE_HP_AMOUNT);
            break;
        case PickupType.SHIELD:
            logger.debug('Activating shield for tank %s', tank.id);
            tank.activateShield(SHIELD_PICKUP_DURATION);
            break;
        case PickupType.SPEED_BOOST:
            logger.debug('Increasing speed for tank %s', tank.id);
            tank.speedMult += SPEED_INCREASE_MULT - 1;
            break;
        case PickupType.DAMAGE_BOOST:
            logger.debug('Increasing damage for tank %s', tank.id);
            tank.damageMult += DAMAGE_INCREASE_MULT - 1;
            break;
        default:
            assert(false);
    }
    pickup.dead = true;
}

export function generatePickups(room: Room, manager: EntityManager): void {
    // NOTE: Offset by one cell from the edge to prevent immediate intersection other entities on spawn.
    const minX = room.boundary.x + CELL_SIZE * 2;
    const minY = room.boundary.y + CELL_SIZE * 2;
    const maxX = room.boundary.x + room.boundary.width - CELL_SIZE * 2;
    const maxY = room.boundary.y + room.boundary.height - CELL_SIZE * 2;
    const minXRel = minX / CELL_SIZE;
    const minYRel = minY / CELL_SIZE;
    const maxXRel = maxX / CELL_SIZE;
    const maxYRel = maxY / CELL_SIZE;

    // TODO: Randomly generate pickups in the room (1-2 at most, probably).
    const selectedPickups = [
        PickupType.HEATH_RESTORE,
        PickupType.SHIELD,
        PickupType.SPEED_BOOST,
        PickupType.DAMAGE_BOOST,
    ];

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

        if (isIntesecting(testRect, manager.player)) continue;
        if (findIntersectingAmong(testRect, room.blocks)) continue;
        if (findIntersectingAmong(testRect, room.pickups)) continue;

        const pickup = new Pickup(pickupType);
        pickup.x = testRect.x;
        pickup.y = testRect.y;
        room.pickups.push(pickup);
        selectedPickups.shift();
    }
}
