import './globals';
import './style.css';

import { Game } from './game';
import { keyboard } from './keyboard';
import { initMenu } from './menu';
import { Renderer, toggleFullscreen } from './renderer';
import { preloadSounds, setVolume } from './sound';
import { assert } from './utils';
import { preloadEffectImages } from './entity/effect';
import { World } from './world';

function main(): void {
    const appElement = document.querySelector<HTMLDivElement>('#app');
    assert(appElement != null, 'No app element found');

    preloadSounds().then(() => console.log('Sounds preloaded'));
    setVolume(0.3);
    preloadEffectImages();
    const renderer = new Renderer();
    appElement.append(renderer.canvas);
    const screen = {
        x: 0,
        y: 0,
        width: renderer.canvas.width,
        height: renderer.canvas.height,
    };
    const world = new World(screen);
    const game = new Game(screen, world);
    const menu = initMenu(game);
    appElement.append(menu);
    menu.showMain();
    renderer.startAnimation(game, menu, localStorage);
    menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);

    window.addEventListener('resize', () => {
        renderer.resizeCanvas(window.innerWidth, window.innerHeight);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });
    keyboard.onKeydown('KeyF', () => {
        toggleFullscreen(appElement)
            .then(() => {
                renderer.resizeCanvas(window.innerWidth, window.innerHeight);
                menu.resize(
                    renderer.canvas.clientWidth,
                    renderer.canvas.clientHeight,
                );
            })
            .catch((err) => console.error(err));
    });
}

main();
