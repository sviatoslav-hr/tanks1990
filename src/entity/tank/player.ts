import { Color } from '#/color';
import { CELL_SIZE } from '#/const';
import { Entity } from '#/entity/core';
import { EntityManager } from '#/entity/manager';
import { Tank } from '#/entity/tank/base';
import { createTankSpriteGroup, makeTankSchema } from '#/entity/tank/generation';
import { GameInput } from '#/input';
import { Direction } from '#/math/direction';
import { Duration } from '#/math/duration';
import { Renderer } from '#/renderer';
import { createShieldSprite } from '#/renderer/sprite';
import { roomSizeInCells } from '#/world';

export class PlayerTank extends Tank implements Entity {
    public readonly maxSpeed = 0;
    public readonly topSpeedReachTime = Duration.milliseconds(50);
    protected readonly shieldSprite = createShieldSprite('player');
    public readonly bot: boolean = false;
    public readonly survivedFor = Duration.zero();

    public dead = true;
    public score = 0;
    public invincible = false;

    readonly schema = makeTankSchema('player', 'medium');
    readonly sprite = createTankSpriteGroup(this.schema);

    constructor(manager: EntityManager) {
        super(manager);
        this.x = this.width / 2;
        this.y = this.height / 2;
    }

    override update(dt: Duration): void {
        super.update(dt);
        if (this.dead) return;
        this.survivedFor.add(dt);
    }

    override respawn(): boolean {
        this.applySchema(this.schema);
        const respawned = super.respawn(true);
        assert(respawned); // Player tank respawn should never fail
        this.x = -this.width / 2;
        this.y = -this.height / 2;
        this.direction = Direction.NORTH;
        this.velocity = 0;
        this.shootingDelay.milliseconds = 0;
        this.score = 0;
        this.survivedFor.milliseconds = 0;
        return true;
    }

    override takeDamage(damage: number): boolean {
        if (this.invincible) return false;
        return super.takeDamage(damage);
    }

    changeDirection(direction: Direction | null): void {
        this.moving = direction != null;
        if (direction != null) {
            if (direction !== this.direction) {
                this.velocity = 0;
            }
            this.direction = direction;
        }
    }

    // TODO: Should be handled in the main loop *probably*
    handleKeyboard(keyboard: GameInput): void {
        let newDirection: Direction | null = null;
        if (keyboard.isDown('KeyA') || keyboard.isDown('ArrowLeft') || keyboard.isDown('KeyH')) {
            newDirection = Direction.WEST;
        }
        if (keyboard.isDown('KeyD') || keyboard.isDown('ArrowRight') || keyboard.isDown('KeyL')) {
            if (newDirection === Direction.WEST) {
                newDirection = null;
            } else {
                newDirection = Direction.EAST;
            }
        }
        if (keyboard.isDown('KeyW') || keyboard.isDown('ArrowUp') || keyboard.isDown('KeyK')) {
            newDirection = Direction.NORTH;
        }
        if (keyboard.isDown('KeyS') || keyboard.isDown('ArrowDown') || keyboard.isDown('KeyJ')) {
            if (newDirection === Direction.NORTH) {
                newDirection = null;
            } else {
                newDirection = Direction.SOUTH;
            }
        }
        if (keyboard.isDown('Space') && !this.shootingDelay.positive) {
            this.shoot();
        }
        this.moving = newDirection != null;
        if (newDirection != null) {
            if (newDirection !== this.direction) {
                this.velocity = 0;
            }
            this.direction = newDirection;
        }
    }

    protected override drawHealthBar(renderer: Renderer): void {
        // TODO: Refactor these draw methods to be more flexible and configurable.
        renderer.useCameraCoords(true);
        renderer.setGlobalAlpha(0.6);
        const barWidth = 20;
        const paddingX = 5;
        const paddingY = 10;
        const barHeight = Math.min(
            renderer.canvas.height - paddingY * 2,
            (roomSizeInCells.height + 2) * CELL_SIZE * renderer.camera.scale,
        );
        const barY = (renderer.canvas.height - barHeight) / 2;
        const barX = paddingX;
        let hpFraction = this.health / this.maxHealth || 0;
        if (!this.healthAnimation.finished) {
            const healthLostFraction = Math.abs(this.health - this.prevHealth) / this.maxHealth;
            hpFraction += (1 - this.healthAnimation.progress) * healthLostFraction;
        }
        {
            const redBarHeight = barHeight * (1 - hpFraction);
            renderer.setFillColor(Color.GREEN_DARKEST);
            renderer.fillRect(barX, barY, barWidth, redBarHeight);
        }
        if (hpFraction > 0) {
            renderer.setFillColor(Color.GREEN);
            const greenBarHeight = barHeight * hpFraction;
            const greenBarY = barY + barHeight - greenBarHeight;
            renderer.fillRect(barX, greenBarY, barWidth, greenBarHeight);
        }
        renderer.setGlobalAlpha(1);
        renderer.setStrokeColor(Color.GREEN);
        renderer.strokeBoundary2(barX, barY, barWidth, barHeight);
        renderer.useCameraCoords(false);
    }

    protected override drawShootingBar(renderer: Renderer): void {
        renderer.useCameraCoords(true);
        renderer.setGlobalAlpha(0.8);
        const fraction =
            1 - this.shootingDelay.milliseconds / this.schema.shootingDelay.milliseconds;
        const barWidth = 20;
        const paddingX = 5;
        const paddingY = 10;
        const barHeight = Math.min(
            renderer.canvas.height - paddingY * 2,
            (roomSizeInCells.height + 2) * CELL_SIZE * renderer.camera.scale,
        );
        const barY = (renderer.canvas.height - barHeight) / 2;
        const barX = renderer.canvas.width - paddingX - barWidth;
        {
            renderer.setFillColor('#493909');
            renderer.fillRect(barX, barY, barWidth, barHeight * (1 - fraction));
        }
        const color = '#ffc107';
        {
            renderer.setFillColor(color);
            renderer.fillRect(
                barX,
                barY + barHeight * (1 - fraction),
                barWidth,
                barHeight * fraction,
            );
        }
        renderer.setGlobalAlpha(1);
        renderer.setStrokeColor(color);
        renderer.strokeBoundary2(barX, barY, barWidth, barHeight);
        renderer.useCameraCoords(false);
    }
}
