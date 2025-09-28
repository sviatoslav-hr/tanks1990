import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {spawnBoom} from '#/effect';
import {Entity, isInside, isIntesecting, isSameEntity, moveEntity} from '#/entity/core';
import {EntityId} from '#/entity/id';
import {EnemyTank, PlayerTank} from '#/entity/tank';
import {damageTank} from '#/entity/tank/simulation';
import {bellCurveInterpolate, lerp} from '#/math';
import {Direction, getDirectionAngle} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2, Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';
import {Sprite} from '#/renderer/sprite';
import {GameState} from '#/state';

interface CreateProjectileOpts {
    x: number;
    y: number;
    size: number;
    ownerId: EntityId;
    direction: Direction;
    shotByPlayer: boolean;
}

export class Projectile extends Entity {
    static readonly SIZE = CELL_SIZE / 5;
    static readonly TRAIL_DISTANCE = CELL_SIZE * 2;

    originalPosition: Vector2;
    ownerId: EntityId;
    direction: Direction;
    shotByPlayer: boolean;
    damage = 0;

    readonly velocity = (1800 * 1000) / (60 * 60);
    readonly sprite = new Sprite({
        key: 'bullet',
        frameWidth: 16,
        frameHeight: 16,
        frameDuration: Duration.milliseconds(100),
        states: [{name: 'moving', frames: 2}],
    });

    constructor(opts: CreateProjectileOpts) {
        super();
        this.x = opts.x - opts.size / 2;
        this.y = opts.y - opts.size / 2;
        this.width = opts.size;
        this.height = opts.size;
        this.originalPosition = new Vector2(this.x, this.y);
        this.ownerId = opts.ownerId;
        this.direction = opts.direction;
        this.shotByPlayer = opts.shotByPlayer;
    }
}

export function spawnProjectile(
    state: GameState,
    ownerId: EntityId,
    origin: Vector2Like,
    direction: Direction,
    damage: number,
): void {
    const deadProjectile = state.projectiles.find((p) => p.dead);
    if (deadProjectile) {
        // NOTE: reuse dead projectiles instead of creating new ones
        const showByPlayer = state.player.id === ownerId;
        reviveProjectileAt(deadProjectile, ownerId, origin.x, origin.y, direction, showByPlayer);
        deadProjectile.damage = damage;
        return;
    }

    const size = Projectile.SIZE;
    const projectile = new Projectile({
        x: origin.x,
        y: origin.y,
        size,
        ownerId,
        direction,
        shotByPlayer: state.player.id === ownerId,
    });
    projectile.damage = damage;
    state.projectiles.push(projectile);
}

function reviveProjectileAt(
    projectile: Projectile,
    ownerId: EntityId,
    x: number,
    y: number,
    direction: Direction,
    shotByPlayer: boolean,
): void {
    assert(projectile.dead, 'Projectile must be dead to be revived');
    projectile.ownerId = ownerId;
    projectile.x = x - projectile.width / 2;
    projectile.y = y - projectile.height / 2;
    projectile.originalPosition.set(projectile.x, projectile.y);
    projectile.dead = false;
    projectile.direction = direction;
    projectile.shotByPlayer = shotByPlayer;
    projectile.sprite.reset();
}

export function simulateAllProjectiles(dt: Duration, state: GameState): void {
    outer: for (const projectile of state.projectiles) {
        if (projectile.dead) continue outer;

        projectile.sprite.update(dt);
        // TODO: use movement equation instead
        moveEntity(projectile, projectile.velocity * dt.seconds, projectile.direction);
        if (!isInside(projectile, state.world.activeRoom.boundary)) {
            spawnBoom(state, projectile.id);
            projectile.dead = true;
            continue outer;
        }

        inner: for (const entity of state.iterateEntities()) {
            if (
                isSameEntity(entity, projectile) ||
                entity.id === projectile.ownerId ||
                entity.dead
            ) {
                continue inner;
            }
            if (isIntesecting(projectile, entity)) {
                projectile.dead = true;
                spawnBoom(state, projectile.id);
                if (entity instanceof Projectile) {
                    entity.dead = true;
                }
                // NOTE: Player can only kill enemies and vice versa
                if (
                    (projectile.shotByPlayer && entity instanceof EnemyTank) ||
                    (!projectile.shotByPlayer && entity instanceof PlayerTank)
                ) {
                    damageTank(entity, projectile.damage, state);
                }
                break inner;
            }
        }
    }
}

export function drawAllProjectiles(renderer: Renderer, projectiles: Projectile[]): void {
    for (const projectile of projectiles) {
        if (projectile.dead) continue;
        drawProjectileTrail(renderer, projectile);
        projectile.sprite.draw(renderer, projectile, getDirectionAngle(projectile.direction));
    }
}

export function drawAllProjectilesDebugUI(renderer: Renderer, projectiles: Projectile[]): void {
    for (const projectile of projectiles) {
        if (projectile.dead) continue;
        renderer.setStrokeColor(Color.PINK);
        renderer.strokeBoundary(projectile, 1);
    }
}

function drawProjectileTrail(renderer: Renderer, projectile: Projectile): void {
    const projectileDistance = projectile.originalPosition.distanceTo(projectile);
    const maxIterations = 15;
    const trailSizeFraction =
        Math.min(projectileDistance, Projectile.TRAIL_DISTANCE) / projectileDistance;
    const distanceRestFraction = 1 - trailSizeFraction;
    const start = new Vector2(
        projectile.x + projectile.width / 2,
        projectile.y + projectile.height / 2,
    );
    const origin = new Vector2(
        projectile.originalPosition.x + projectile.width / 2,
        projectile.originalPosition.y + projectile.height / 2,
    );
    const diff = start.clone().sub(origin);
    const maxThickness = projectile.width / 1.5;
    const minThickness = projectile.width / 2;

    for (let index = maxIterations; index > 0; index--) {
        const indexProgress = index / maxIterations;
        const dt = lerp(distanceRestFraction, 1, indexProgress);
        const endX = origin.x + diff.x * dt;
        const endY = origin.y + diff.y * dt;
        renderer.setStrokeColor(Color.GRAY_GRANITE);
        const alpha = lerp(0.0, 0.3, indexProgress);
        renderer.setGlobalAlpha(alpha);
        const trailThickness = bellCurveInterpolate(minThickness, maxThickness, indexProgress);
        renderer.strokeLine(start.x, start.y, endX, endY, trailThickness);
        start.x = endX;
        start.y = endY;
    }
    renderer.setGlobalAlpha(1);
}
