import {EntityManager} from '#/entity/manager';
import {EventQueue, GameEvent} from '#/events';
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
                    const volumeScale = event.bot ? 0.15 : 1;
                    sounds.playSound(SoundType.SHOOTING, volumeScale);
                }
                manager.spawnProjectile(event.entityId, event.origin, event.direction);
                break;
            }

            case 'tank-destroyed': {
                manager.spawnExplosionEffect(event.entityId);
                if (event.bot) {
                    manager.player.score += 1;
                    const entity = manager.findTank(event.entityId);
                    if (entity) {
                        entity.room.aliveEnemiesCount -= 1;
                    } else {
                        console.warn(
                            `Tank with id ${event.entityId} not found even though it was destroyed`,
                        );
                    }
                }
                sounds.playSound(SoundType.EXPLOSION);
                break;
            }
        }
    }
}
