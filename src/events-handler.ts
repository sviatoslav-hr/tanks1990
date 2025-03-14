import {EntityManager} from '#/entity/manager';
import {EventQueue, GameEvent, ShotEvent} from '#/events';
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
                handleShotEvent(event, game, manager, sounds);
                break;
            }
            case 'tank-destroyed': {
                manager.spawnExplosionEffect(event.entityId);
                if (event.bot) {
                    manager.player.score += 1;
                }
                sounds.playSound(SoundType.EXPLOSION);
                break;
            }
        }
    }
}

function handleShotEvent(
    event: ShotEvent,
    game: GameState,
    entityManager: EntityManager,
    sounds: SoundManager,
): void {
    if (game.playing) {
        // NOTE: Play sounds only during active gameplay to not pollute the other states
        const volumeScale = event.bot ? 0.15 : 1;
        sounds.playSound(SoundType.SHOOTING, volumeScale);
    }
    entityManager.spawnProjectile(event.entityId, event.origin, event.direction);
}
