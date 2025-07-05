import {EntityId} from '#/entity/id';
import {EnemyTank} from '#/entity/tank';
import {TankPartKind} from '#/entity/tank-generation';

export class EnemyWave {
    private aliveEnemies: EntityId[] = [];
    private enemyRespawnQueue: EntityId[] = [];

    constructor(
        private expectedEnemies: TankPartKind[],
        private readonly enemyLimitAtOnce: number,
    ) {
        assert(enemyLimitAtOnce > 0);
    }

    get enemiesCount(): number {
        return this.aliveEnemies.length + this.enemyRespawnQueue.length;
    }

    get nextEnemyKind(): TankPartKind | undefined {
        return this.expectedEnemies[0];
    }

    get hasRespawnPlace(): boolean {
        return this.aliveEnemies.length < this.enemyLimitAtOnce;
    }

    get hasExpectedEnemies(): boolean {
        return this.expectedEnemies.length > 0;
    }

    spawnEnemy(enemy: EnemyTank): void {
        enemy.markForRespawn();
        enemy.respawnDelay.setMilliseconds(0);
        const respawned = enemy.respawn();
        if (!respawned) return; // No respawn place available.

        this.aliveEnemies.push(enemy.id);
        const index = this.enemyRespawnQueue.indexOf(enemy.id);
        if (index !== -1) {
            this.enemyRespawnQueue.splice(index, 1);
        }
    }

    queueEnemy(enemy: EnemyTank, enemyKind?: TankPartKind): void {
        enemy.markForRespawn();
        if (!enemyKind) {
            enemyKind = this.expectedEnemies.pop() ?? 'light';
        }
        enemy.defineKind(enemyKind);
        this.enemyRespawnQueue.push(enemy.id);
    }

    handleEnemyDeath(enemyId: EntityId): void {
        const index = this.aliveEnemies.indexOf(enemyId);
        if (index > -1) {
            this.aliveEnemies.splice(index, 1);
        } else {
            logger.warn('Enemy tank with id %i not found even though it was destroyed', enemyId);
        }
    }

    clearExpected(): void {
        this.expectedEnemies = [];
    }
}

interface EnemyWaveConfig {
    enemies: TankPartKind[]; // rename to `queue`?
    limitAtOnce?: number; // By default inherits from prev room
}

// NOTE: Wave index corresponds to the room index.
export const wavePerRoom = makeWaves(
    // NOTE: Start with one medium tank: not overwhelming with many enemies, but also not too easy to kill.
    {enemies: ['medium'], limitAtOnce: 1},
    // NOTE: In the next room we teach player that he can play against multiple enemies at once.
    {enemies: ['light', 'light'], limitAtOnce: 2},
    // NOTE: In this room we show that more enemies can be spawned.
    {enemies: ['light', 'light', 'light']},
    {enemies: ['light', 'medium', 'light']},
    {enemies: ['light', 'medium', 'light', 'medium']},
    {enemies: ['light', 'light', 'medium', 'light', 'medium'], limitAtOnce: 3},
    {enemies: ['light', 'medium', 'heavy', 'light', 'medium']},
    {enemies: ['light', 'medium', 'heavy', 'medium', 'heavy', 'medium']},
    {enemies: ['light', 'light', 'medium', 'heavy', 'medium', 'heavy', 'medium'], limitAtOnce: 4},
    {enemies: ['light', 'medium', 'medium', 'heavy', 'medium', 'heavy', 'medium']},
);

function makeWaves(...configs: EnemyWaveConfig[]): EnemyWave[] {
    const waves: EnemyWave[] = configs.map((config, i) => {
        assert(config.enemies.length);
        if (config.limitAtOnce == null) {
            const prevWaveConfig = configs[i - 1];
            assert(prevWaveConfig?.limitAtOnce != null);
            config.limitAtOnce = prevWaveConfig.limitAtOnce;
        }

        const wave = new EnemyWave(config.enemies, config.limitAtOnce);
        return wave;
    });
    return waves;
}
