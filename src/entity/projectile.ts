import {Camera} from '#/camera';
import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {
    Direction,
    Entity,
    isInside,
    isIntesecting,
    moveEntity,
    scaleMovement,
} from '#/entity/core';
import {Sprite} from '#/entity/sprite';
import {Tank} from '#/entity/tank';
import {bellCurveInterpolate, lerp} from '#/math';
import {Duration} from '#/math/duration';
import {Vector2} from '#/math/vector';
import {Renderer} from '#/renderer';
import {World} from '#/world';

export class Projectile implements Entity {
    public static SIZE = CELL_SIZE / 5;
    public dead = false;
    public originalPosition: Vector2;
    public width: number;
    public height: number;
    private readonly v = 600;
    private readonly sprite = new Sprite({
        key: 'bullet',
        frameWidth: 16,
        frameHeight: 16,
        frameDuration: Duration.milliseconds(100),
        states: [{name: 'moving', frames: 2}],
    });
    static readonly TRAIL_DISTANCE = CELL_SIZE * 2;

    constructor(
        public x: number,
        public y: number,
        size: number,
        private world: World,
        private owner: Tank,
        public direction: Direction,
    ) {
        this.width = size;
        this.height = size;
        this.originalPosition = new Vector2(x, y);
    }

    static spawn(
        owner: Tank,
        world: World,
        x: number,
        y: number,
        direction: Direction,
    ): Projectile {
        const deadProjectile = world.projectiles.find((p) => p.dead);
        if (deadProjectile) {
            // NOTE: reuse dead projectiles instead of creating new ones
            deadProjectile.reviveAt(owner, x, y);
            deadProjectile.direction = direction;
            return deadProjectile;
        }
        const size = Projectile.SIZE;
        const projectile = new Projectile(
            x - size / 2,
            y - size / 2,
            size,
            world,
            owner,
            direction,
        );
        // TODO: measure if dead projectiles should be cleaned up at some point
        world.projectiles.push(projectile);
        return projectile;
    }

    update(dt: Duration, camera: Camera): void {
        if (this.dead) {
            return;
        }
        if (!camera.isRectVisible(this)) {
            this.dead = true;
            return;
        }

        this.sprite.update(dt);
        // TODO: use movement equation instead
        moveEntity(this, scaleMovement(this.v, dt), this.direction);
        if (!isInside(this, this.world.boundary)) {
            this.dead = true;
            return;
        }
        for (const entity of this.world.iterateEntities()) {
            if (entity === this || entity === this.owner || entity.dead) {
                continue;
            }
            if (isIntesecting(this, entity)) {
                this.dead = true;
                if (entity instanceof Projectile) {
                    entity.dead = true;
                }
                if (entity instanceof Tank) {
                    this.owner.doDamage(entity);
                }
            }
        }
    }

    draw(renderer: Renderer): void {
        if (this.dead) {
            return;
        }
        this.drawTrail(renderer);
        this.sprite.draw(renderer, this, this.direction);
        if (this.world.showBoundary) {
            renderer.setStrokeColor(Color.PINK);
            renderer.strokeBoundary(this, 1);
        }
    }

    reviveAt(ownder: Tank, x: number, y: number): void {
        this.owner = ownder;
        this.originalPosition.set(x, y);
        this.x = x;
        this.y = y;
        this.dead = false;
        this.direction = Direction.UP;
        this.sprite.reset();
    }

    private drawTrail(renderer: Renderer): void {
        const projectileDistance = this.originalPosition.distanceTo(this);
        const maxIterations = 15;
        const trailSizeFraction =
            Math.min(projectileDistance, Projectile.TRAIL_DISTANCE) /
            projectileDistance;
        const distanceRestFraction = 1 - trailSizeFraction;
        const start = new Vector2(
            this.x + this.width / 2,
            this.y + this.height / 2,
        );
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
            const trailThickness = bellCurveInterpolate(
                minThickness,
                maxThickness,
                indexProgress,
            );
            renderer.strokeLine(start.x, start.y, endX, endY, trailThickness);
            start.x = endX;
            start.y = endY;
        }
        renderer.setGlobalAlpha(1);
    }
}
