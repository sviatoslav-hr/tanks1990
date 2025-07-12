import {Entity} from '#/entity/core';
import {EntityManager} from '#/entity/manager';
import {Tank} from '#/entity/tank/base';
import {createTankSpriteGroup, makeTankSchema} from '#/entity/tank/generation';
import {EventQueue} from '#/events';
import {GameInput} from '#/input';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {createShieldSprite} from '#/renderer/sprite';

export function isPlayerTank(tank: Tank): tank is PlayerTank {
    return !tank.bot;
}

export class PlayerTank extends Tank implements Entity {
    readonly maxSpeed = 0;
    readonly topSpeedReachTime = Duration.milliseconds(50);
    readonly shieldSprite = createShieldSprite('player');
    readonly bot: boolean = false;
    // TODO: This field shouldn't exist here, it should somewhere in the score layer, probably.
    readonly survivedFor = Duration.zero();
    // HACK: This field is used as a flag to indicate that the game is completed.
    //       It should be removed once `survivedFor` will be moved out of this class.
    completedGame = false;

    dead = true;
    score = 0;
    invincible = false;

    readonly schema = makeTankSchema('player', 'medium');
    readonly sprite = createTankSpriteGroup(this.schema);

    constructor(manager: EntityManager) {
        super(manager);
        this.x = this.width / 2;
        this.y = this.height / 2;
    }

    override update(dt: Duration): void {
        super.update(dt);
        if (!this.completedGame && !this.dead) this.survivedFor.add(dt);
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

    override takeDamage(damage: number, events: EventQueue): boolean {
        if (this.invincible) return false;
        return super.takeDamage(damage, events);
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
}
