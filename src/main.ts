import "./style.css";

import {
    createCanvas,
    handleResize,
    startAnimation,
    toggleFullscreen,
} from "./canvas";
import { BASE_HEIGHT, BASE_WIDTH } from "./const";
import { Context } from "./context";
import { Game } from "./game";
import { Keyboard } from "./keyboard";
import { Menu, initMenu } from "./menu";
import { assertError, panic } from "./utils";

const appElement =
    document.querySelector<HTMLDivElement>("#app") ??
    panic("App element should exist");

const canvas = createCanvas(BASE_WIDTH, BASE_HEIGHT);
appElement.append(canvas);
const ctx = new Context(
    canvas.getContext("2d") ?? panic("Context should be available"),
);
const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
const game = new Game(screen);
const menu = new Menu();
appElement.append(menu);
initMenu(menu, game);
menu.showMain();
startAnimation(ctx, game, menu, localStorage);

handleResize(canvas);
window.addEventListener("resize", () => handleResize(canvas));
Keyboard.onKeydown("KeyF", () => {
    toggleFullscreen(appElement)
        .then(() => handleResize(canvas))
        .catch((err) => {
            assertError(err);
            console.error(err);
        });
});
