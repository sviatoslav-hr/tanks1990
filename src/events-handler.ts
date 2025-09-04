import {spawnBoom, spawnExplosionEffect} from '#/effect';
import {spawnProjectile} from '#/entity/projectile';
import type {EventQueue, GameControlEvent, GameEvent} from '#/events';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import {MenuBridge} from '#/menu';
import {initEntities} from '#/simulation';
import {SoundName, type SoundManager} from '#/sound';
import {soundEvent} from '#/sound-event';
import type {GameState} from '#/state';
import {notify} from '#/ui/notification';

export function handleGameEvents(
    eventQueue: EventQueue,
    state: GameState,
    sounds: SoundManager,
    menu: MenuBridge,
): void {
    let event: GameEvent | undefined;
    while ((event = eventQueue.pop())) {
        switch (event.type) {
            case 'shot': {
                if (state.playing) {
                    // NOTE: Play sounds only during active game-play to not pollute the other states
                    soundEvent(eventQueue, event.bot ? 'enemy-shooting' : 'player-shooting');
                }
                const {entityId, origin, direction, damage} = event;
                spawnProjectile(state, entityId, origin, direction, damage);
                break;
            }

            case 'tank-destroyed': {
                // TODO: Do I really need an event for this? (Probably, no)
                spawnExplosionEffect(state, event.entityId);
                if (event.bot) {
                    const entity = state.findTank(event.entityId);
                    if (entity) {
                        const wave = state.world.activeRoom.wave;
                        wave.removeEnemyFromAlives(entity.id);
                    }
                }
                soundEvent(eventQueue, event.bot ? 'enemy-destroyed' : 'player-destroyed');
                break;
            }

            case 'projectile-exploded':
                spawnBoom(state, event.entityId);
                break;

            case 'game-control':
                handleGameControlEvent(event, state, sounds, eventQueue, menu);
                break;

            case 'sound':
                sounds.playSound(event.config);
                break;
        }
    }
}

function handleGameControlEvent(
    event: GameControlEvent,
    state: GameState,
    sounds: SoundManager,
    eventQueue: EventQueue,
    menu: MenuBridge,
): boolean {
    switch (event.action) {
        case 'init':
            state.init();
            menu.view.set('main');
            return true;

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

            soundEvent(eventQueue, 'game-started');
            if (state.battleMusic) {
                state.battleMusic.stop();
                state.battleMusic.play();
            } else {
                state.battleMusic = sounds.playSound({
                    name: SoundName.BATTLE_THEME,
                    volume: 0.5,
                    loop: true,
                });
            }
            return true;
        }

        case 'pause':
            state.pause();
            if (!event.ignoreMenu) menu.view.set('pause');
            return true;

        case 'resume':
            state.resume();
            menu.view.set(null);
            return true;

        case 'game-over': {
            state.battleMusic?.stop();
            const playedRecording = state.recording.playing;
            state.markDead();
            menu.view.set('dead');
            if (!playedRecording) {
                soundEvent(eventQueue, 'game-over');
            }
            return true;
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
            return true;
        }
    }
}
