import { Context } from "./context";
import { drawFPS, drawGrid, drawScore } from "./draw";
import { Tank } from "./entity";
import { Game, GameStatus } from "./game";
import { Keyboard } from "./keyboard";
import { Menu } from "./menu";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    return element;
}

export function startAnimation(ctx: Context, game: Game, menu: Menu): void {
    let lastTimestamp = performance.now();
    let showFPS = false;
    let showBoundary = false;
    const animate = function (timestamp: number): void {
        const status = game.status;
        const screen = game.screen;
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        drawGrid(ctx, game.screen, Tank.SIZE);
        game.drawTanks(ctx);
        if (showFPS) drawFPS(ctx, dt);

        if (
            status === GameStatus.PAUSED ||
            status === GameStatus.DEAD ||
            (status === GameStatus.PLAYING && Keyboard.pressed.KeyQ)
        ) {
            drawScore(ctx, game.player, screen);
        }
        if (game.player.dead && status === GameStatus.PLAYING) {
            game.status = GameStatus.DEAD;
            menu.showDead();
        }
        game.updateTanks(dt, showBoundary);
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    Keyboard.listen(document.body);
    Keyboard.onKeydown("KeyF", () => (showFPS = !showFPS));
    Keyboard.onKeydown("KeyB", () => (showBoundary = !showBoundary));
    Keyboard.onKeydown("Escape", () => {
        switch (game.status) {
            case GameStatus.PLAYING: {
                menu.showPause();
                game.status = GameStatus.PAUSED;
                break;
            }
            case GameStatus.PAUSED: {
                menu.hide();
                game.status = GameStatus.PLAYING;
                break;
            }
            case GameStatus.DEAD: {
                menu.showMain();
                game.status = GameStatus.START;
                break;
            }
            case GameStatus.START:
                break;
            default:
                console.warn("Unhandled value ", game.status);
        }
    });
    menu.onButtonClick(() => {
        game.updateStatusByMenu();
        menu.updateByGame(game.status);
    });
}
