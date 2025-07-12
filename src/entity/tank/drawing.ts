import {Color} from '#/color';
import {Tank} from '#/entity/tank/base';
import {Renderer} from '#/renderer';
import {World} from '#/world';

export function drawAllTanks(renderer: Renderer, tanks: Tank[], world: World): void {
    for (const tank of tanks) {
        if (!tank.dead) {
            tank.sprite.draw(renderer, tank, tank.direction);
            if (tank.hasShield) {
                tank.shieldSprite.draw(renderer, tank.shieldBoundary);
            }

            if (world.showBoundary) {
                drawTankBoundary(renderer, tank);
            }
        }

        // NOTE: Draw health bar animation even if dead for dramatic effect.
        if (!tank.dead || tank.healthAnimation.active) {
            drawTankHealthBarAbove(renderer, tank);
            const showBoundary = !tank.dead && world.showBoundary;
            // NOTE: It only makes sense to draw the shooting bar for bots for debug purposes
            if (!tank.bot || showBoundary) {
                drawTankShootingBarAbove(renderer, tank);
            }
            if (showBoundary && tank.isStuck) {
                renderer.setStrokeColor(Color.RED);
                renderer.strokeBoundary(tank, 1);
            }
        }
    }
}

function enemyDraw(render: Renderer, tank: Tank): void {
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

function drawTankHealthBarAbove(renderer: Renderer, tank: Tank) {
    // NOTE: Draw hp bar only if the tank is not full health.
    if (tank.health === tank.maxHealth) return;
    const barWidth = tank.width * 0.9;
    // NOTE: Draw health bar in camera size, since it's a UI element and it should not scale.
    const barHeight = 3 / renderer.camera.scale;
    const barOffset = 6 / renderer.camera.scale;
    const barX = tank.x + (tank.width - barWidth) / 2;
    const barY = tank.y - barHeight - barOffset;
    renderer.setFillColor(Color.GREEN_DARKEST);
    renderer.fillRect(barX, barY, barWidth, barHeight);
    let hpFraction = tank.health / tank.maxHealth || 0;
    if (!tank.healthAnimation.finished) {
        const healthLostFraction = Math.abs(tank.health - tank.prevHealth) / tank.maxHealth;
        hpFraction += (1 - tank.healthAnimation.progress) * healthLostFraction;
    }
    if (hpFraction) {
        renderer.setFillColor(Color.GREEN);
        renderer.fillRect(barX, barY, barWidth * hpFraction, barHeight);
    }
}

function drawTankShootingBarAbove(renderer: Renderer, tank: Tank): void {
    if (!tank.shootingDelay.positive) return;
    const barWidth = tank.width * 0.9;
    // NOTE: Draw health bar in camera size, since it's a UI element and it should not scale.
    const barHeight = 3 / renderer.camera.scale;
    const barOffset = 3 / renderer.camera.scale;
    const barX = tank.x + (tank.width - barWidth) / 2;
    const barY = tank.y - barHeight - barOffset;
    renderer.setFillColor(Color.ORANGE_SAFFRON);
    const fraction = 1 - tank.shootingDelay.milliseconds / tank.schema.shootingDelay.milliseconds;
    renderer.fillRect(barX, barY, barWidth * fraction, barHeight);
}

function drawTankBoundary(renderer: Renderer, tank: Tank): void {
    renderer.setStrokeColor(Color.PINK);
    renderer.strokeBoundary(tank, 1);
    renderer.setFont('400 16px Helvetica', 'center', 'middle');
    renderer.setFillColor(Color.WHITE);
    const velocity = ((tank.velocity * 3600) / 1000).toFixed(2);
    const acc = tank.lastAcceleration.toFixed(2);
    renderer.fillText(
        `${tank.id}: a=${acc};v=${velocity}km/h`,
        // `ID:${tank.id}: {${Math.floor(this.x)};${Math.floor(this.y)}}`,
        {
            x: tank.x + tank.width / 2,
            y: tank.y - tank.height / 2,
        },
    );
}
