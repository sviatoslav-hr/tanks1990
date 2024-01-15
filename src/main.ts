import { createCanvas, startAnimation } from "./canvas";
import { Context } from "./context";
import { querySelector } from "./dom";
import { Game } from "./game";
import { Menu, initMenu } from "./menu";
import { Opt } from "./option";
import "./style.css";

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const appElement = querySelector<HTMLDivElement>("#app").expect(
    "App element should exist",
);

const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
appElement.append(canvas);
const ctx = new Context(
    Opt.from(canvas.getContext("2d")).expect("Context should be available"),
);
const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
const game = new Game(screen);
const menu = new Menu();
appElement.append(menu);
initMenu(menu, game);
menu.showMain();
startAnimation(ctx, game, menu);
