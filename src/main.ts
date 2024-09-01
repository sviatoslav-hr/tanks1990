import './style.css';
import './globals';

import { Game } from './game';
import { keyboard } from './keyboard';
import { Menu, initMenu } from './menu';
import { Renderer, toggleFullscreen } from './renderer';
import { preloadSounds } from './sound';
import { assert } from './utils';

function main(): void {
    const appElement = document.querySelector<HTMLDivElement>('#app');
    assert(appElement != null, 'No app element found');

    preloadSounds();
    const renderer = new Renderer();
    appElement.append(renderer.canvas);
    const screen = {
        x: 0,
        y: 0,
        width: renderer.canvas.width,
        height: renderer.canvas.height,
    };
    const game = new Game(screen);
    const menu = new Menu();
    appElement.append(menu);
    initMenu(menu, game);
    menu.showMain();
    renderer.startAnimation(game, menu, localStorage);

    window.addEventListener('resize', () => renderer.resizeCanvasByWindow());
    keyboard.onKeydown('KeyF', () => {
        toggleFullscreen(appElement)
            .then(() => renderer.resizeCanvasByWindow())
            .catch((err) => console.error(err));
    });
}

main();
