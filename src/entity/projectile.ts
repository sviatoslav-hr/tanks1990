import {Color} from '#/color';
import {GameConfig} from '#/config';
import {CELL_SIZE} from '#/const';
import {Entity, isInside, isIntesecting, isSameEntity, moveEntity} from '#/entity/core';
import {EntityId} from '#/entity/id';
import {EntityManager} from '#/entity/manager';
import {EnemyTank, PlayerTank} from '#/entity/tank';
import {EventQueue} from '#/events';
import {bellCurveInterpolate, lerp} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2} from '#/math/vector';
import {Renderer} from '#/renderer';
import {Camera} from '#/renderer/camera';
import {Sprite} from '#/renderer/sprite';

interface CreateProjectileOpts {
    x: number;
    y: number;
    size: number;
    ownerId: EntityId;
    direction: Direction;
    shotByPlayer: boolean;
}

export class Projectile extends Entity {
    public static SIZE = CELL_SIZE / 5;
    public originalPosition: Vector2;
    public ownerId: EntityId;
    private direction: Direction;
    private shotByPlayer: boolean;
    public damage = 0;

    private readonly velocity = (1800 * 1000) / (60 * 60);
    private readonly sprite = new Sprite({
        key: 'bullet',
        frameWidth: 16,
        frameHeight: 16,
        frameDuration: Duration.milliseconds(100),
        states: [{name: 'moving', frames: 2}],
    });
    static readonly TRAIL_DISTANCE = CELL_SIZE * 2;

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

    update(dt: Duration, manager: EntityManager, camera: Camera, events: EventQueue): void {
        if (this.dead) {
            return;
        }
        if (!camera.isRectVisible(this)) {
            this.dead = true;
            return;
        }

        this.sprite.update(dt);
        // TODO: use movement equation instead
        moveEntity(this, this.velocity * dt.seconds, this.direction);
        if (!isInside(this, manager.world.activeRoom.boundary)) {
            events.push({type: 'projectile-exploded', entityId: this.id});
            this.dead = true;
            return;
        }

        for (const entity of manager.iterateEntities()) {
            if (isSameEntity(entity, this) || entity.id === this.ownerId || entity.dead) {
                continue;
            }
            if (isIntesecting(this, entity)) {
                this.dead = true;
                events.push({type: 'projectile-exploded', entityId: this.id});
                if (entity instanceof Projectile) {
                    entity.dead = true;
                }
                // NOTE: Player can only kill enemies and vice versa
                if (
                    (this.shotByPlayer && entity instanceof EnemyTank) ||
                    (!this.shotByPlayer && entity instanceof PlayerTank)
                ) {
                    entity.takeDamage(this.damage, events);
                }
                break;
            }
        }
    }

    draw(renderer: Renderer, config: GameConfig): void {
        if (this.dead) {
            return;
        }
        this.drawTrail(renderer);
        this.sprite.draw(renderer, this, this.direction);
        if (config.debugShowBoundaries) {
            renderer.setStrokeColor(Color.PINK);
            renderer.strokeBoundary(this, 1);
        }
    }

    reviveAt(
        ownerId: EntityId,
        x: number,
        y: number,
        direction: Direction,
        shotByPlayer: boolean,
    ): void {
        this.ownerId = ownerId;
        this.x = x - this.width / 2;
        this.y = y - this.height / 2;
        this.originalPosition.set(this.x, this.y);
        this.dead = false;
        this.direction = direction;
        this.shotByPlayer = shotByPlayer;
        this.sprite.reset();
    }

    private drawTrail(renderer: Renderer): void {
        const projectileDistance = this.originalPosition.distanceTo(this);
        const maxIterations = 15;
        const trailSizeFraction =
            Math.min(projectileDistance, Projectile.TRAIL_DISTANCE) / projectileDistance;
        const distanceRestFraction = 1 - trailSizeFraction;
        const start = new Vector2(this.x + this.width / 2, this.y + this.height / 2);
        const origin = new Vector2(
            this.originalPosition.x + this.width / 2,
            this.originalPosition.y + this.height / 2,
        );
        const diff = start.clone().sub(origin);
        const maxThickness = this.width / 1.5;
        const minThickness = this.width / 2;

        for (let index = maxIterations; index > 0; index--) {
            const indexProgress = index / maxIterations;
            const dt = lerp(distanceRestFraction, 1, indexProgress);
            const endX = origin.x + diff.x * dt;
            const endY = origin.y + diff.y * dt;
            renderer.setStrokeColor(Color.GRAY);
            const alpha = lerp(0.0, 0.3, indexProgress);
            renderer.setGlobalAlpha(alpha);
            const trailThickness = bellCurveInterpolate(minThickness, maxThickness, indexProgress);
            renderer.strokeLine(start.x, start.y, endX, endY, trailThickness);
            start.x = endX;
            start.y = endY;
        }
        renderer.setGlobalAlpha(1);
    }
}
