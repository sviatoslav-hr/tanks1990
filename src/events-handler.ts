import type {EntityManager} from '#/entity/manager';
import type {EventQueue, GameControlEvent, GameEvent} from '#/events';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import type {Menu} from '#/menu';
import {SoundName, type SoundManager} from '#/sound';
import {soundEvent} from '#/sound-event';
import type {GameState} from '#/state';
import {notify} from '#/ui/notification';

export function handleGameEvents(
    eventQueue: EventQueue,
    game: GameState,
    manager: EntityManager,
    sounds: SoundManager,
    menu: Menu,
): void {
    let event: GameEvent | undefined;
    while ((event = eventQueue.pop())) {
        switch (event.type) {
            case 'shot': {
                if (game.playing) {
                    // NOTE: Play sounds only during active game-play to not pollute the other states
                    soundEvent(eventQueue, event.bot ? 'enemy-shooting' : 'player-shooting');
                }
                const {entityId, origin, direction, damage} = event;
                manager.spawnProjectile(entityId, origin, direction, damage);
                break;
            }

            case 'tank-destroyed': {
                manager.spawnExplosionEffect(event.entityId);
                if (event.bot) {
                    const entity = manager.findTank(event.entityId);
                    if (entity) {
                        const wave = manager.world.activeRoom.wave;
                        wave.removeEnemyFromAlives(entity.id);
                    }
                }
                soundEvent(eventQueue, event.bot ? 'enemy-destroyed' : 'player-destroyed');
                break;
            }

            case 'projectile-exploded':
                manager.spawnBoom(event.entityId);
                break;

            case 'game-control':
                handleGameControlEvent(event, game, manager, sounds, eventQueue, menu);
                break;

            case 'sound':
                sounds.playSound(event.config);
                break;
        }
    }
}

function handleGameControlEvent(
    event: GameControlEvent,
    game: GameState,
    manager: EntityManager,
    sounds: SoundManager,
    eventQueue: EventQueue,
    menu: Menu,
): boolean {
    switch (event.action) {
        case 'init':
            game.init();
            menu.showMain();
            return true;

        // TODO: For now there is no difference between "new game" and "restart"
        //       but later "new game" should generate a random seed.
        case 'start': {
            {
                const seed = getURLSeed();
                random.reset(seed ?? undefined);
                setURLSeed(random.seed);
                game.recording.playing = false;
                game.start();
                manager.init();
                menu.hide();
            }

            soundEvent(eventQueue, 'game-started');
            if (game.battleMusic) {
                game.battleMusic.play();
            } else {
                game.battleMusic = sounds.playSound({
                    name: SoundName.BATTLE_THEME,
                    volume: 0.5,
                    loop: true,
                });
            }
            return true;
        }

        case 'pause':
            game.pause();
            game.battleMusic?.pause();
            if (!event.ignoreMenu) menu.showPause();
            return true;

        case 'resume':
            game.resume();
            game.battleMusic?.resume();
            menu.hide();
            return true;

        case 'game-over': {
            game.battleMusic?.stop();
            const playedRecording = game.recording.playing;
            game.markDead();
            menu.showDead();
            if (!playedRecording) {
                soundEvent(eventQueue, 'game-over');
            }
            return true;
        }

        case 'game-completed': {
            manager.player.completedGame = true;
            game.markCompleted();
            const timeoutMs = 5000;
            notify('Congratulation!', {timeoutMs});
            notify(`Completed in ${manager.player.survivedFor.toHumanString()}`, {timeoutMs});
            setTimeout(() => {
                menu.showCompleted();
            }, timeoutMs);
            return true;
        }
    }
}
