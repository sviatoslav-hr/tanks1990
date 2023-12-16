import { createCanvas, startAnimation } from "./canvas";
import { KeyCode, keyboard } from "./keyboard";
import "./style.css";

const appElement = document.querySelector<HTMLDivElement>("#app")!;
appElement.innerHTML = `
<h1>Tanks 1990</h1>
`;

const canvas = createCanvas();
appElement.append(canvas);
startAnimation(canvas);

document.body.addEventListener("keydown", (ev) =>
    keyboard.setPressed(ev.code as KeyCode),
);
document.body.addEventListener("keyup", (ev) =>
    keyboard.setReleased(ev.code as KeyCode),
);
