import './globals';
import './style.css';

import {Game} from '#/game';
import {GameInput} from '#/game-input';
import {initMenu} from '#/menu';
import {Renderer, toggleFullscreen} from '#/renderer';
import {preloadSounds, setVolume} from '#/sound';
import {assert} from '#/utils';
import {preloadEffectImages} from '#/entity/effect';
import {World} from '#/world';
import {getStoredGetMode, setStoredDevMode} from '#/storage';

function main(): void {
    const appElement = document.querySelector<HTMLDivElement>('#app');
    assert(appElement != null, 'No app element found');
    window.__DEV_MODE = getStoredGetMode(localStorage);

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
    const input = new GameInput();
    const world = new World(screen, input);
    const game = new Game(screen, world);
    const menu = initMenu(game);
    appElement.append(menu);
    menu.showMain();
    renderer.startAnimation(game, input, menu, localStorage);
    menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);

    window.addEventListener('resize', () => {
        renderer.resizeCanvas(window.innerWidth, window.innerHeight);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });
    input.onKeydown('Semicolon', () => {
        window.__DEV_MODE = !window.__DEV_MODE;
        setStoredDevMode(localStorage, window.__DEV_MODE);
        console.log(`Dev mode: ${window.__DEV_MODE ? 'ON' : 'OFF'}`);
    });
    input.onKeydown('KeyF', () => {
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
