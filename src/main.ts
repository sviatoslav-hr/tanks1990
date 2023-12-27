import { createCanvas, startAnimation } from "./canvas";
import "./style.css";

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
    throw new Error("Cannot find app element");
}

const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
appElement.append(canvas);
startAnimation(canvas);
