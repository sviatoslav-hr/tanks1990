import {tryCacheExplosions} from '#/effect';
import {drawPickups} from '#/entity/pickup';
import {drawAllProjectiles, drawAllProjectilesDebugUI} from '#/entity/projectile';
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

export function drawGame(renderer: Renderer, state: GameState, options: DrawGameOptions): void {
    const {world} = state;
    drawWorldBackground(renderer, world);
    for (const effect of state.effects) {
        effect.draw(renderer);
    }
    drawPickups(renderer, world.activeRoom.pickups);

    for (const boom of state.booms) {
        boom.draw(renderer);
    }

    drawAllTankModels(renderer, state.tanks);
    drawWorldBlocks(renderer, world);
    tryCacheExplosions(renderer, state);
    drawAllProjectiles(renderer, state.projectiles);

    if (options.drawUI) {
        if (state.debugShowBoundaries) {
            drawWorldDebugUI(renderer, world);
            drawAllProjectilesDebugUI(renderer, state.projectiles);
            drawAllTanksDevUI(renderer, state.tanks);
        }
        drawEnemyTanksUI(renderer, state.tanks);
        drawPlayerTankUI(renderer, state.player);
    }
}
