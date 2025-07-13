import {GameConfig} from '#/config';
import {tryCacheExplosions} from '#/effect';
import type {EntityManager} from '#/entity/manager';
import {
    drawAllTankModels,
    drawAllTanksDevUI,
    drawEnemyTanksUI,
    drawPlayerTankUI,
} from '#/entity/tank/drawing';
import type {Renderer} from '#/renderer';

export interface DrawGameOptions {
    drawUI: boolean;
}

export function drawGame(
    renderer: Renderer,
    config: GameConfig,
    manager: EntityManager,
    options: DrawGameOptions,
): void {
    const {drawUI} = options;
    renderer.setFillColor(manager.world.bgColor);
    renderer.fillScreen();
    const {world} = manager;
    world.drawTiles(renderer);
    for (const effect of manager.effects) {
        effect.draw(renderer);
    }
    world.drawRooms(renderer, config);
    drawAllTankModels(renderer, manager.tanks);
    tryCacheExplosions(renderer, manager);
    for (const projectile of manager.projectiles) {
        projectile.draw(renderer, config);
    }
    if (drawUI) {
        if (config.debugShowBoundaries) drawAllTanksDevUI(renderer, manager.tanks);
        drawEnemyTanksUI(renderer, manager.tanks);
        drawPlayerTankUI(renderer, manager.player);
    }
}
