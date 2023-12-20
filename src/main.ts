import { createCanvas, startAnimation } from "./canvas";
import "./style.css";

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const appElement = document.querySelector<HTMLDivElement>("#app")!;
appElement.innerHTML = `
<h1>Tanks 1990</h1>
`;

const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
appElement.append(canvas);
startAnimation(canvas);
