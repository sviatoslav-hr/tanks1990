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
import {drawWorldBackground, drawWorldBlocks, drawWorldDebugUI} from '#/world/drawing';

export interface DrawGameOptions {
    drawUI: boolean;
}

export function drawGame(
    renderer: Renderer,
    config: GameConfig,
    manager: EntityManager,
    options: DrawGameOptions,
): void {
    const {world} = manager;
    drawWorldBackground(renderer, world);
    for (const effect of manager.effects) {
        effect.draw(renderer);
    }
    drawWorldBlocks(renderer, world);
    for (const boom of manager.booms) {
        boom.draw(renderer);
    }

    drawAllTankModels(renderer, manager.tanks);
    tryCacheExplosions(renderer, manager);
    for (const projectile of manager.projectiles) {
        projectile.draw(renderer, config);
    }
    if (options.drawUI) {
        if (config.debugShowBoundaries) drawWorldDebugUI(renderer, world);
        if (config.debugShowBoundaries) drawAllTanksDevUI(renderer, manager.tanks);
        drawEnemyTanksUI(renderer, manager.tanks);
        drawPlayerTankUI(renderer, manager.player);
    }
}
