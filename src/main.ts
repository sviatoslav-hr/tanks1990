import { createCanvas, startAnimation } from './canvas';
import './style.css'

const appElement = document.querySelector<HTMLDivElement>('#app')!;;
appElement.innerHTML = `
<h1>Tanks 1990</h1>
`;

const canvas = createCanvas();
appElement.append(canvas);
startAnimation(canvas);
