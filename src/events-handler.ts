import type {GameEvent} from '#/events';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import {MenuBridge} from '#/menu';
import {initEntities} from '#/simulation';
import {SoundName, type SoundManager} from '#/sound';
import {soundEvent} from '#/sound-event';
import type {GameState} from '#/state';
import {notify} from '#/ui/notification';

export function handleGameEvents(state: GameState, sounds: SoundManager, menu: MenuBridge): void {
    let event: GameEvent | undefined;
    while ((event = state.events.pop())) {
        switch (event.action) {
            case 'init':
                state.init();
                menu.view.set('main');
                continue;

            // TODO: For now there is no difference between "new game" and "restart"
            //       but later "new game" should generate a random seed.
            case 'start': {
                {
                    const seed = event.recordingSeed ?? getURLSeed();
                    random.reset(seed ?? undefined);
                    if (!event.recordingSeed) {
                        setURLSeed(random.seed);
                        state.recording.playing = false;
                    }
                    state.start();
                    initEntities(state);
                    menu.view.set(null);
                }

                soundEvent(state.sounds, 'game-started');
                if (state.battleMusic) {
                    state.battleMusic.stop();
                    state.battleMusic.play();
                } else {
                    state.battleMusic = sounds.play({
                        name: SoundName.BATTLE_THEME,
                        volume: 0.5,
                        loop: true,
                    });
                }
                continue;
            }

            case 'pause':
                state.pause();
                if (!event.ignoreMenu) menu.view.set('pause');
                continue;

            case 'resume':
                state.resume();
                menu.view.set(null);
                continue;

            case 'game-over': {
                state.battleMusic?.stop();
                const playedRecording = state.recording.playing;
                state.markDead();
                menu.view.set('dead');
                if (!playedRecording) {
                    soundEvent(state.sounds, 'game-over');
                }
                continue;
            }

            case 'game-completed': {
                state.player.completedGame = true;
                state.markCompleted();
                const timeoutMs = 5000;
                notify('Congratulation!', {timeoutMs});
                notify(`Completed in ${state.player.survivedFor.toHumanString()}`, {timeoutMs});
                setTimeout(() => {
                    menu.view.set('completed');
                }, timeoutMs);
                continue;
            }
        }
    }
}
