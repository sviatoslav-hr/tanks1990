import type {GameEvent} from '#/events';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import {MenuBridge} from '#/menu';
import {SoundName} from '#/sound';
import {soundEvent} from '#/sound-event';
import {
    completeGame,
    markGameDead,
    pauseGame,
    resumeGame,
    startGame,
    type GameState,
} from '#/state';
import {notify} from '#/ui/notification';

export function handleGameEvents(state: GameState, menu: MenuBridge): void {
    let event: GameEvent | undefined;
    while ((event = state.events.pop())) {
        switch (event.action) {
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
                    startGame(state);
                    menu.view.set(null);
                }

                soundEvent(state.sounds, 'game-started');
                if (state.battleMusic) {
                    state.battleMusic.stop();
                    state.battleMusic.play();
                } else {
                    state.battleMusic = state.sounds.play({
                        name: SoundName.BATTLE_THEME,
                        volume: 0.5,
                        loop: true,
                    });
                }
                continue;
            }

            case 'pause':
                pauseGame(state);
                if (!event.ignoreMenu) menu.view.set('pause');
                continue;

            case 'resume':
                resumeGame(state);
                menu.view.set(null);
                continue;

            case 'game-over': {
                state.battleMusic?.stop();
                const playedRecording = state.recording.playing;
                markGameDead(state);
                menu.view.set('dead');
                if (!playedRecording) {
                    soundEvent(state.sounds, 'game-over');
                }
                continue;
            }

            case 'game-completed': {
                completeGame(state);
                const timeoutMs = 1000;
                notify('Congratulation!', {timeoutMs});
                notify(`Completed in ${state.player.survivedFor.toHumanString()}`, {timeoutMs});
                setTimeout(() => {
                    // TODO: Why this is inside a setTimeout?
                    menu.view.set('completed');
                }, timeoutMs);
                continue;
            }
        }
    }
}
