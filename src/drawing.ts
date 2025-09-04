import {GameConfig} from '#/config';
import {tryCacheExplosions} from '#/effect';
import {drawPickups} from '#/entity/pickup';
import {
    drawAllTankModels,
    drawAllTanksDevUI,
    drawEnemyTanksUI,
    drawPlayerTankUI,
} from '#/entity/tank/drawing';
import type {Renderer} from '#/renderer';
import {GameState} from '#/state';
import {drawWorldBackground, drawWorldBlocks, drawWorldDebugUI} from '#/world/drawing';

export interface DrawGameOptions {
    drawUI: boolean;
}

export function drawGame(
    renderer: Renderer,
    config: GameConfig,
    state: GameState,
    options: DrawGameOptions,
): void {
    const {world} = state;
    drawWorldBackground(renderer, world);
    for (const effect of state.effects) {
        effect.draw(renderer);
    }
    drawWorldBlocks(renderer, world);
    drawPickups(renderer, world.activeRoom.pickups);

    for (const boom of state.booms) {
        boom.draw(renderer);
    }

    drawAllTankModels(renderer, state.tanks);
    tryCacheExplosions(renderer, state);
    for (const projectile of state.projectiles) {
        projectile.draw(renderer, config);
    }
    if (options.drawUI) {
        if (config.debugShowBoundaries) drawWorldDebugUI(renderer, world);
        if (config.debugShowBoundaries) drawAllTanksDevUI(renderer, state.tanks);
        drawEnemyTanksUI(renderer, state.tanks);
        drawPlayerTankUI(renderer, state.player);
    }
}
