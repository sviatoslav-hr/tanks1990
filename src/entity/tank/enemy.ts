import { Animation } from '#/animation';
import { Color } from '#/color';
import { Entity } from '#/entity/core';
import { Tank } from '#/entity/tank/base';
import { createTankSpriteGroup, makeTankSchema } from '#/entity/tank/generation';
import { sameSign } from '#/math';
import { Direction } from '#/math/direction';
import { Duration } from '#/math/duration';
import { Vector2, Vector2Like } from '#/math/vector';
import { findPath } from '#/pathfinding';
import { Renderer } from '#/renderer';
import { createShieldSprite } from '#/renderer/sprite';

export class EnemyTank extends Tank implements Entity {
    private static readonly RESPAWN_DELAY = Duration.milliseconds(1000);
    protected moving = true;
    protected schema = makeTankSchema('enemy', 'medium');
    protected sprite = createTankSpriteGroup(this.schema);
    protected readonly shieldSprite = createShieldSprite('enemy');
    private readonly SEARCH_DELAY = Duration.milliseconds(5000);
    private targetSearchTimer = this.SEARCH_DELAY.clone();
    private targetPath: Vector2[] = [];
    private collided = false;
    private readonly collisionAnimation = new Animation(Duration.milliseconds(1000)).end();
    readonly respawnDelay = EnemyTank.RESPAWN_DELAY.clone();

    update(dt: Duration): void {
        if (this.dead && this.room.wave.hasRespawnPlace) {
            this.respawnDelay.sub(dt).max(0);
            return;
        }
        const player = this.manager.player;
        // NOTE: is collided, don't change the direction, allowing entities to move away from each other
        if (this.collided) {
            this.velocity = 0;
        }
        if (!this.dead) {
            // TODO: if player is dead, choose a random direction
            let newDirection = player.dead ? null : this.findTargetDirection(player, dt);
            if (newDirection != null && newDirection !== this.direction) {
                this.velocity = 0;
                this.direction = newDirection;
            }
        }
        this.collisionAnimation.update(dt);
        this.collided = false;
        const targetPoint = this.targetPath[0] ?? null;
        if (targetPoint && !this.dead) {
            const dxPrev = this.cx - targetPoint.x;
            const dyPrev = this.cy - targetPoint.y;
            super.update(dt);
            if (!this.isStuck) {
                this.handleMaybeMissedTargetPoint(targetPoint, dxPrev, dyPrev);
            }
        } else {
            super.update(dt);
        }
        // TODO: Can we still achieve this check without providing the camera?
        // if (camera.isRectVisible(this)) { this.shoot(); }
        this.shoot();
    }

    draw(renderer: Renderer): void {
        const world = this.manager.world;
        super.draw(renderer);
        if (this.dead) return;
        if (world.showBoundary) {
            // if (this.collisionAnimation.active) {
            //     renderer.setStrokeColor(Color.WHITE_NAVAJO);
            //     renderer.strokeBoundary(this, this.collisionAnimation.progress * 10);
            // }
            if (this.isStuck) {
                renderer.setStrokeColor(Color.RED);
                renderer.strokeBoundary(this, 1);
            }
            if (!this.manager.player.dead) {
                this.drawPath(renderer);
            }
        }
    }

    markForRespawn(): void {
        this.respawnDelay.setFrom(EnemyTank.RESPAWN_DELAY);
        this.shouldRespawn = true;
    }

    override respawn(): boolean {
        assert(this.shouldRespawn);
        this.collided = false;
        this.respawnDelay.setMilliseconds(0);
        this.targetPath = [];
        this.targetSearchTimer.setMilliseconds(0);
        return super.respawn();
    }

    private handleMaybeMissedTargetPoint(targetPoint: Vector2, dxPrev: number, dyPrev: number) {
        const dx = this.cx - targetPoint.x;
        const dy = this.cy - targetPoint.y;
        // NOTE: If entity overstepped the target point, stop it and move back to target.
        //       But only if case of a turn, because in a straight line tank starts bugging.
        if ((dxPrev === dx && !sameSign(dyPrev, dy)) || (dyPrev === dy && !sameSign(dxPrev, dx))) {
            this.targetPath.shift();
            if (this.isAtPoint(targetPoint)) {
            }
            const nextPoint = this.targetPath[0];
            if (nextPoint) {
                const nextDir = this.getDirectionToPoint(nextPoint);
                if (!nextDir) return;
                const targetDir = this.direction;
                if (targetDir === nextDir) {
                    return;
                }
                this.velocity = 0;
                const prevX = this.x;
                const prevY = this.y;
                if (dxPrev === dx) {
                    this.y = targetPoint.y - this.height / 2;
                } else if (dyPrev === dy) {
                    this.x = targetPoint.x - this.width / 2;
                }
                const c = this.manager.findCollided(this);
                if (c) {
                    this.x = prevX;
                    this.y = prevY;
                }
            }
        }
    }

    protected override handleCollision(target: Entity): void {
        this.collided = true;
        this.collisionAnimation.reset();
        if (target.id !== this.manager.player.id && !this.manager.player.dead) {
            this.direction = this.recalculateDirectionPath(this.manager.player) ?? this.direction;
        }
        if (target instanceof EnemyTank) {
            target.collided = true;
            target.collisionAnimation.reset();
        }
    }

    protected override onDied(): void {
        this.respawnDelay.setFrom(EnemyTank.RESPAWN_DELAY);
    }

    private findTargetDirection(target: Entity, dt: Duration): Direction | null {
        this.targetSearchTimer.sub(dt).max(0);
        if (this.targetPath.length && this.targetSearchTimer.positive) {
            const targetPoint = this.targetPath[0];
            if (!targetPoint) return null;
            if (this.isAtPoint(targetPoint)) {
                this.targetPath.shift();
                const nextPoint = this.targetPath[0];
                return nextPoint ? this.getDirectionToPoint(nextPoint) : null;
            }
            return this.getDirectionToPoint(targetPoint);
        }

        return this.recalculateDirectionPath(target);
    }

    private recalculateDirectionPath(target: Entity): Direction | null {
        this.targetSearchTimer.setFrom(this.SEARCH_DELAY);
        const path = findPath(this, target, this.manager, 1000, undefined, false);
        if (path) {
            this.targetPath = path;
            const nextPoint = this.targetPath[0];
            assert(nextPoint);
            return this.getDirectionToPoint(nextPoint);
        }
        return null;
    }

    private isAtPoint(next: Vector2): boolean {
        // NOTE: If entity is close enough to the target point, consider it reached
        const eps = 1;
        const diff = Math.max(Math.abs(this.cx - next.x), Math.abs(this.cy - next.y));
        return diff < eps;
    }

    private getDirectionToPoint(next: Vector2Like): Direction | null {
        const dx = next.x - Math.floor(this.cx);
        if (dx !== 0) {
            return dx > 0 ? Direction.EAST : Direction.WEST;
        }
        const dy = next.y - Math.floor(this.cy);
        if (dy !== 0) {
            return dy > 0 ? Direction.SOUTH : Direction.NORTH;
        }
        return null;
    }

    private drawPath(renderer: Renderer): void {
        if (this.targetPath.length < 2) {
            return;
        }
        renderer.setStrokeColor('blue');
        renderer.setFillColor('blue');
        const p0 = this.targetPath[0]!;
        renderer.strokeLine(p0.x, p0.y, this.x + this.width / 2, this.y + this.height / 2, 1);
        renderer.setStrokeColor(Color.ORANGE_SAFFRON);
        renderer.setFillColor(Color.ORANGE_SAFFRON);
        for (let i = 0; i < this.targetPath.length - 1; i++) {
            const p1 = this.targetPath[i];
            assert(p1);
            renderer.fillCircle(p1.x, p1.y, 2);
            const p2 = this.targetPath[i + 1];
            assert(p2);
            renderer.strokeLine(p1.x, p1.y, p2.x, p2.y, 1);
        }
    }
}
