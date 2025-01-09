import {Color} from '#/color';
import {DevUI} from '#/dev-ui';
import {GameInput} from '#/game-input';
import {handleGameInputTick} from '#/game-input-handler';
import {Duration} from '#/math/duration';
import {Menu} from '#/menu';
import {Renderer} from '#/renderer';
import {drawScore, saveBestScore} from '#/score';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {World} from '#/world';

export function runGame(
    state: GameState,
    world: World,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
) {
    renderer.resizeCanvas(window.innerWidth, window.innerHeight);
    menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    menu.showMain();
    input.listen(document.body);

    window.addEventListener('resize', () => {
        renderer.resizeCanvas(window.innerWidth, window.innerHeight);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });

    let lastTimestamp = 0;
    const animationCallback = (timestamp: number): void => {
        const dt = Duration.since(lastTimestamp).min(1000 / 30);
        lastTimestamp = timestamp;

        try {
            handleGameTick(dt, state, world, menu, input, storage, renderer);
            handleGameInputTick(
                input,
                renderer,
                state,
                world,
                menu,
                devUI,
                storage,
            );
            devUI.update(dt);
            input.nextTick();
            state.nextTick();
        } catch (err) {
            console.error('Error in animationCallback', err);
        }

        window.requestAnimationFrame(animationCallback);
    };

    window.requestAnimationFrame(animationCallback);
}

function handleGameTick(
    dt: Duration,
    state: GameState,
    world: World,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    renderer: Renderer,
) {
    renderer.setFillColor(Color.BLACK_RAISIN);
    renderer.fillScreen();

    world.draw(renderer);

    if (state.paused || state.dead || (state.playing && input.isDown('KeyQ'))) {
        drawScore(renderer, world.player, storage);
    }

    if (world.player.dead && state.playing && !menu.dead) {
        menu.showDead();
        saveBestScore(storage, world.player.score);
    }

    if (state.playing || state.debugUpdateTriggered) {
        world.update(dt, renderer.camera);
        if (world.isInfinite) {
            renderer.camera.centerOn(world.player);
        }
    }
}
