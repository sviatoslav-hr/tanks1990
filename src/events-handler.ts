import {EntityManager} from '#/entity/manager';
import {EventQueue, GameEvent} from '#/events';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import {SoundManager, SoundType} from '#/sound';
import {GameState} from '#/state';

export function handleGameEvents(
    eventQueue: EventQueue,
    game: GameState,
    manager: EntityManager,
    sounds: SoundManager,
): void {
    let event: GameEvent | undefined;
    while ((event = eventQueue.pop())) {
        switch (event.type) {
            case 'shot': {
                if (game.playing) {
                    // NOTE: Play sounds only during active gameplay to not pollute the other states
                    const volumeScale = event.bot ? 0.15 : 0.6;
                    sounds.playSound(SoundType.SHOOTING, volumeScale);
                }
                const {entityId, origin, direction, damage} = event;
                manager.spawnProjectile(entityId, origin, direction, damage);
                break;
            }

            case 'tank-damaged': {
                const volumeScale = event.bot ? 0.3 : 0.8;
                sounds.playSound(SoundType.HIT, volumeScale);
                break;
            }

            case 'tank-destroyed': {
                manager.spawnExplosionEffect(event.entityId);
                if (event.bot) {
                    manager.player.score += 1;
                    const entity = manager.findTank(event.entityId);
                    if (entity) {
                        entity.room.wave.removeEnemyFromAlives(entity.id);
                    }
                }
                const volumeScale = event.bot ? 0.6 : 1;
                sounds.playSound(SoundType.EXPLOSION, volumeScale);
                break;
            }

            case 'game-control': {
                switch (event.action) {
                    case 'start': {
                        sounds.playSound(SoundType.LEVEL_START, 1.5);
                        const seed = getURLSeed();
                        random.reset(seed ?? undefined);
                        setURLSeed(random.seed);
                        game.recording.playing = false;
                        game.start();
                        manager.init();
                        break;
                    }
                    case 'resume':
                        game.resume();
                        break;
                    case 'init':
                        game.init();
                        break;
                    default:
                        throw new Error(`Unknown game control action: ${event.action}`);
                }
                break;
            }
        }
    }
}
