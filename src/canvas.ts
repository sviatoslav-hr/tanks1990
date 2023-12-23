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

export function startAnimation(canvas: HTMLCanvasElement): void {
    const ctx = new Context(canvas.getContext("2d")!);
    const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new EnemyTank(screen));
    State.tanks.forEach((t) => (t.dead = true));
    const player = new PlayerTank(screen);
    State.tanks.push(player);

    let lastTimestamp = performance.now();
    let showFPS = false;
    let showBoundary = false;
    const animate = function (timestamp: number): void {
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        drawGrid(ctx, screen, Tank.SIZE);
        State.tanks.forEach((t) => t.draw(ctx));
        if (showFPS) {
            drawFPS(ctx, dt);
        }
        if (player.dead || Keyboard.pressed.KeyQ) {
            drawScore(ctx, player, screen);
        }
        for (const tank of State.tanks) {
            tank.showBoundary = showBoundary;
            tank.update(dt);
            if (tank.dead && tank.bot) {
                tank.respawn();
            }
        }
        if (player.dead && Keyboard.pressed.KeyR) {
            player.respawn();
        }
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    Keyboard.listen(document.body);
    Keyboard.onKeydown("KeyF", () => (showFPS = !showFPS));
    Keyboard.onKeydown("KeyB", () => (showBoundary = !showBoundary));
}
