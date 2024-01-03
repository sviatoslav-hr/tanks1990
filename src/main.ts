import { createCanvas, startAnimation } from "./canvas";
import { Context } from "./context";
import { Game } from "./game";
import { Menu, initMenu } from "./menu";
import "./style.css";

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
    throw new Error("Cannot find app element");
}

const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
appElement.append(canvas);
const ctx = new Context(canvas.getContext("2d")!);
const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
const game = new Game(screen);
const menu = new Menu();
appElement.append(menu);
initMenu(menu, game);
menu.showMain();
startAnimation(ctx, game, menu);
