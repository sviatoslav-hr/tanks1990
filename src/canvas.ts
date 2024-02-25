import { Color } from "./color";
import { BASE_HEIGHT, BASE_WIDTH, CELL_SIZE } from "./const";
import { Context } from "./context";
import { drawFPS, drawGrid, drawScore } from "./draw";
import { Game, GameStatus } from "./game";
import { keyboard } from "./keyboard";
import { Menu } from "./menu";
import {
    getStoredShowBoundaries,
    getStoredShowFps,
    saveBestScore,
    setStoredShowBoundaries,
    setStoredShowFps,
} from "./storage";
import { assertError, panic } from "./utils";

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
    let showFPS = getStoredShowFps(storage);
    let showBoundary = getStoredShowBoundaries(storage);
    const animate = function(timestamp: number): void {
        const screen = game.screen;
        const dt = Math.min(timestamp - lastTimestamp, 1000 / 30);
        lastTimestamp = timestamp;
        ctx.clearScreen();
        ctx.setFillColor(Color.BLACK_RAISIN);
        ctx.drawRect(
            game.screen.x,
            game.screen.y,
            game.screen.width,
            game.screen.height,
        );
        drawGrid(ctx, game.screen, CELL_SIZE);
        game.drawTanks(ctx);
        if (showFPS) drawFPS(ctx, dt);

        if (
            game.paused ||
            game.dead ||
            (game.playing && keyboard.isDown("KeyQ"))
        ) {
            drawScore(ctx, game.player, screen, storage);
        }
        if (game.player.dead && game.playing && !menu.dead) {
            saveBestScore(storage, game.player.score);
            menu.showDead();
        }
        game.updateTanks(dt, showBoundary);
        keyboard.reset();
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    // TODO: animation function shouldn't be responsible for Keyboard handling
    keyboard.listen(document.body);
    keyboard.onKeydown("Backquote", () => {
        showFPS = !showFPS;
        setStoredShowFps(storage, showFPS);
    });
    keyboard.onKeydown("KeyB", () => {
        showBoundary = !showBoundary;
        setStoredShowBoundaries(storage, showBoundary);
    });
    keyboard.onKeydown("Escape", () => {
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

export function handleResize(canvas: HTMLCanvasElement): void {
    resizeCanvas(canvas, window.innerWidth, window.innerHeight);
}

export async function toggleFullscreen(
    appElement: HTMLDivElement,
): Promise<void> {
    if (!document.fullscreenEnabled) {
        console.warn("Fullscreen is either not supported or disabled");
        return;
    }
    if (document.fullscreenElement) {
        await document.exitFullscreen().catch((err) => {
            assertError(err);
            panic("ERROR: failed to exit Fullscreen\n" + err.message);
        });
    } else {
        await appElement.requestFullscreen().catch((err) => {
            assertError(err);
            panic("ERROR: failed to enter Fullscreen\n" + err.message);
        });
    }
}

export function resizeCanvas(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
): void {
    const shouldScale = width < BASE_WIDTH || height < BASE_HEIGHT;
    if (document.fullscreenElement || shouldScale) {
        const padding = 20;
        const sx = (width - padding) / BASE_WIDTH;
        const sy = (height - padding) / BASE_HEIGHT;
        const sMin = Math.min(sx, sy);
        const resWidth = BASE_WIDTH * sMin;
        const resHeight = BASE_HEIGHT * sMin;
        canvas.style.width = resWidth + "px";
        canvas.style.height = resHeight + "px";
    } else {
        canvas.style.width = "";
        canvas.style.height = "";
    }
}
