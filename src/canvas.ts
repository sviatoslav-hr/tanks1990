import { Context } from "./context";
import { drawFPS, drawGrid, drawScore } from "./draw";
import { EnemyTank, PlayerTank, Tank } from "./entity";
import { Keyboard } from "./keyboard";
import { State } from "./state";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    return element;
}

enum GameStatus {
    START,
    PLAYING,
    PAUSED,
    DEAD,
}

export function startAnimation(canvas: HTMLCanvasElement): void {
    const ctx = new Context(canvas.getContext("2d")!);
    const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    let status = GameStatus.START;
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new EnemyTank(screen));
    State.tanks.forEach((t) => (t.dead = true));
    const player = new PlayerTank(screen);
    State.tanks.push(player);

    let lastTimestamp = performance.now();
    let showFPS = false;
    let showBoundary = false;
    updateMenu(status);
    const animate = function (timestamp: number): void {
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        drawGrid(ctx, screen, Tank.SIZE);
        State.tanks.forEach((t) => t.draw(ctx));
        if (showFPS) {
            drawFPS(ctx, dt);
        }
        if (
            status === GameStatus.PAUSED ||
            status === GameStatus.DEAD ||
            (status === GameStatus.PLAYING && Keyboard.pressed.KeyQ)
        ) {
            drawScore(ctx, player, screen);
        }
        if (player.dead && status === GameStatus.PLAYING) {
            status = GameStatus.DEAD;
            updateMenu(status);
        }
        if (status === GameStatus.PLAYING || status === GameStatus.DEAD) {
            for (const tank of State.tanks) {
                tank.showBoundary = showBoundary;
                tank.update(dt);
                if (tank.dead && tank.bot) {
                    tank.respawn();
                }
            }
        }
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    Keyboard.listen(document.body);
    Keyboard.onKeydown("KeyF", () => (showFPS = !showFPS));
    Keyboard.onKeydown("KeyB", () => (showBoundary = !showBoundary));
    Keyboard.onKeydown("Escape", () => {
        switch (status) {
            case GameStatus.PLAYING: {
                status = GameStatus.PAUSED;
                break;
            }
            case GameStatus.PAUSED: {
                status = GameStatus.PLAYING;
                break;
            }
            case GameStatus.DEAD: {
                status = GameStatus.START;
                break;
            }
            case GameStatus.START:
                break;
            default:
                console.warn("Unhandled value ", status);
        }
        updateMenu(status);
    });
    document
        .querySelector("#menu button")
        ?.addEventListener("click", (event) => {
            status = handleButtonClick(event, status, player);
            updateMenu(status);
        });
}

function updateMenu(status: GameStatus): void {
    const menu = document.getElementById("menu") as HTMLDivElement | null;
    if (!menu) {
        console.error("Cannot find the menu element");
        return;
    }
    let className = ""; // clear all the classes
    switch (status) {
        case GameStatus.START: {
            className += "start";
            break;
        }
        case GameStatus.PLAYING: {
            className += "hidden";
            break;
        }
        case GameStatus.PAUSED: {
            className += "pause";
            break;
        }
        case GameStatus.DEAD: {
            className += "dead";
            break;
        }
    }
    menu.className = className;
    console.log(`className=${className}`);
    if (!className.includes("hidden")) {
        console.log("should focus");
        const button = menu.querySelector("button");
        if (button) {
            button.focus();
        } else {
            console.warn("Cannot find menu button");
        }
    }
}

function handleButtonClick(
    event: Event,
    status: GameStatus,
    player: PlayerTank,
): GameStatus {
    (event.target as HTMLButtonElement)?.blur();
    switch (status) {
        case GameStatus.PAUSED:
            return GameStatus.PLAYING;
        case GameStatus.PLAYING:
            return GameStatus.PAUSED;
        case GameStatus.START:
        case GameStatus.DEAD: {
            player.respawn();
            return GameStatus.PLAYING;
        }
    }
}
