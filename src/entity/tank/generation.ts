import type {Rect} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import type {Renderer} from '#/renderer';
import {Sprite} from '#/renderer/sprite';

const tankPartKinds = ['light', 'medium', 'heavy'] as const;
export type TankPartKind = (typeof tankPartKinds)[number];

export interface TankSchema {
    turret: TankPartKind;
    body: TankPartKind;
    damage: number;
    shootingDelay: Duration;
    maxHealth: number;
    maxSpeed: number;
    topSpeedReachTime: Duration;
}

export function makeTankSchema(bot: boolean, kind: TankPartKind): TankSchema {
    // NOTE: Player should be faster because the game feel better this way.
    const speedCoef = bot ? 1 : 1.5;
    const shootingCoef = bot ? 1 : 1;
    return {
        // NOTE: For now turret and body are the same kind for the sake of simplicity.
        turret: kind,
        body: kind,
        damage: tankKindDamage[kind],
        shootingDelay: Duration.milliseconds(tankKindShootingDelayMillis[kind] * shootingCoef),
        maxHealth: tankKindMaxHealth[kind],
        maxSpeed: tankKindSpeed[kind] * speedCoef,
        topSpeedReachTime: Duration.milliseconds(bot ? 150 : 50),
    };
}

export const RESTORE_HP_AMOUNT = 10;
export const SPEED_INCREASE_MULT = 1.2; // 20% speed increase per power-up
export const DAMAGE_INCREASE_MULT = 1.2; // 20% damage increase per power-up

const tankKindMaxHealth: Record<TankPartKind, number> = {
    light: 20,
    medium: 30,
    heavy: 40,
};

const tankKindSpeed: Record<TankPartKind, number> = {
    light: (360 * 1000) / (60 * 60), // in m/s
    medium: (300 * 1000) / (60 * 60),
    heavy: (240 * 1000) / (60 * 60),
};

const tankKindDamage: Record<TankPartKind, number> = {
    light: 5,
    medium: 10,
    heavy: 15,
};

const tankKindShootingDelayMillis: Record<TankPartKind, number> = {
    light: 1000,
    medium: 1500,
    heavy: 2000,
};

function makeTankTurretSprite(keyPrefix: string, kind: TankPartKind): Sprite<'static'> {
    switch (kind) {
        case 'light':
            return new Sprite({
                key: `${keyPrefix}_turret_${kind}`,
                frameWidth: 44,
                frameHeight: 68,
                framePadding: 3,
                states: [{name: 'static', frames: 1}],
            });
        case 'medium':
            return new Sprite({
                key: `${keyPrefix}_turret_${kind}`,
                frameWidth: 42,
                frameHeight: 72,
                framePadding: 3,
                states: [{name: 'static', frames: 1}],
            });
        case 'heavy':
            return new Sprite({
                key: `${keyPrefix}_turret_${kind}`,
                frameWidth: 48,
                frameHeight: 83,
                framePadding: 3,
                states: [{name: 'static', frames: 1}],
            });
    }
}

function makeTankBodySprite(keyPrefix: string, kind: TankPartKind, bot: boolean): Sprite<'moving'> {
    return new Sprite({
        key: `${keyPrefix}_body_${kind}`,
        frameWidth: 64,
        frameHeight: 64,
        framePadding: 3,
        // HACK: Tracks animation speed should be dependent by the speed of the tank.
        frameDuration: Duration.milliseconds(bot ? 60 : 40),
        states: [{name: 'moving', frames: 6}],
    });
}

const turretYOffsets: Record<TankPartKind, number> = {
    light: 10,
    medium: 11,
    heavy: 8,
};

export function createTankSpriteGroup(bot: boolean, schema: TankSchema): TankSpriteGroup {
    const keyPrefix = bot ? 'tank_darkgray' : 'tank_green';
    const turret = makeTankTurretSprite(keyPrefix, schema.turret);
    const body = makeTankBodySprite(keyPrefix, schema.body, bot);
    return new TankSpriteGroup(turret, body, schema);
}

export class TankSpriteGroup {
    constructor(
        readonly turret: Sprite<'static'>,
        readonly body: Sprite<'moving'>,
        readonly schema: TankSchema,
    ) {}

    draw(renderer: Renderer, boundary: Rect, direction: Direction): void {
        // FIXME: Sprites look better (not blurry) when smoothing is disabled,
        //        but is also causes jittering on big screens. (Not sure how to fix it yet)
        if (renderer.imageSmoothingDisabled) renderer.ctx.imageSmoothingEnabled = false;
        this.body.draw(renderer, boundary, direction - 180);
        {
            const turret = this.turret;
            const bodyHeight = this.body.frameHeight - this.body.framePadding * 2;
            const sizeRatio = bodyHeight / boundary.height;
            const turretYOffset = turretYOffsets[this.schema.turret] / sizeRatio;
            const turretWidth = (turret.frameWidth - turret.framePadding * 2) / sizeRatio;
            const turretHeight = (turret.frameHeight - turret.framePadding * 2) / sizeRatio;
            const wdiff = boundary.width - turretWidth;
            const cx = boundary.x + boundary.width / 2;
            const cy = boundary.y + boundary.height / 2;
            // NOTE: We need to rotate the turret around the center of the tank body
            //       because it's being offset from the center of the tank.
            const spriteBoundary = rotateRectAround(
                {
                    x: boundary.x + wdiff / 2,
                    y: boundary.y + turretYOffset,
                    width: turretWidth,
                    height: turretHeight,
                },
                cx,
                cy,
                direction - 180,
            );
            this.turret.draw(renderer, spriteBoundary, direction - 180);
        }
        if (renderer.imageSmoothingDisabled) renderer.ctx.imageSmoothingEnabled = true;
    }

    update(dt: Duration): void {
        this.body.update(dt);
    }
}

function rotateRectAround(rect: Rect, cx: number, cy: number, angle: number) {
    angle = ((angle % 360) + 360) % 360; // Normalize angle

    let {x, y, width, height} = rect;

    const dx = x - cx;
    const dy = y - cy;

    switch (angle) {
        case 0:
            return {x, y, width, height};
        case 90:
            return {
                x: cx - dy - height,
                y: cy + dx,
                width: height,
                height: width,
            };
        case 180:
            return {
                x: cx - dx - width,
                y: cy - dy - height,
                width,
                height,
            };
        case 270:
            return {
                x: cx + dy,
                y: cy - dx - width,
                width: height,
                height: width,
            };
        default:
            throw new Error('Only angles 0, 90, 180, 270 are supported');
    }
}
