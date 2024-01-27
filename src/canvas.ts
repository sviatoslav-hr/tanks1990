import { Color } from "./color";
import { Context } from "./context";
import { drawFPS, drawGrid, drawScore } from "./draw";
import { Tank } from "./entity";
import { Game, GameStatus } from "./game";
import { Keyboard } from "./keyboard";
import { Menu } from "./menu";
import { saveBestScore } from "./storage";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    return element;
}

export function startAnimation(
    ctx: Context,
    game: Game,
    menu: Menu,
    storage: Storage,
): void {
    let lastTimestamp = performance.now();
    let showFPS = false;
    let showBoundary = false;
    const animate = function (timestamp: number): void {
        const screen = game.screen;
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        ctx.setFillColor(Color.BLACK_RAISIN);
        ctx.drawRect(
            game.screen.x,
            game.screen.y,
            game.screen.width,
            game.screen.height,
        );
        drawGrid(ctx, game.screen, Tank.SIZE);
        game.drawTanks(ctx);
        if (showFPS) drawFPS(ctx, dt);

        if (
            game.paused ||
            game.dead ||
            (game.playing && Keyboard.pressed.KeyQ)
        ) {
            drawScore(ctx, game.player, screen, storage);
        }
        if (game.player.dead && game.playing && !menu.dead) {
            saveBestScore(storage, game.player.score);
            menu.showDead();
        }
        game.updateTanks(dt, showBoundary);
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    // TODO: animation function shouldn't be responsible for Keyboard handling
    Keyboard.listen(document.body);
    Keyboard.onKeydown("Backquote", () => (showFPS = !showFPS));
    Keyboard.onKeydown("KeyB", () => (showBoundary = !showBoundary));
    Keyboard.onKeydown("Escape", () => {
        switch (game.status) {
            case GameStatus.PLAYING: {
                if (game.dead) {
                    menu.showMain();
                    game.init();
                } else {
                    menu.showPause();
                    game.pause();
                }
                break;
            }
            case GameStatus.PAUSED: {
                menu.hide();
                game.resume();
                break;
            }
            case GameStatus.INITIAL:
                break;
            default:
                console.warn("Unhandled value ", game.status);
        }
    });
}
