import { createCanvas, startAnimation } from "./canvas";
import { KeyCode, Keyboard } from "./keyboard";
import "./style.css";

const appElement = document.querySelector<HTMLDivElement>("#app")!;
appElement.innerHTML = `
<h1>Tanks 1990</h1>
`;

const canvas = createCanvas();
appElement.append(canvas);
startAnimation(canvas);

document.body.addEventListener("keydown", (ev) =>
    Keyboard.setPressed(ev.code as KeyCode),
);
document.body.addEventListener("keyup", (ev) =>
    Keyboard.setReleased(ev.code as KeyCode),
);
