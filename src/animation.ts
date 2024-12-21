import {clamp} from '#/math';
import {Duration} from '#/math/duration';

type EasingFunction = (t: number) => number;

export class Animation {
    progress = 0;
    readonly duration: Duration;
    readonly elapsed = Duration.zero();
    readonly easing?: EasingFunction;

    constructor(duration: Duration, easing?: EasingFunction) {
        this.duration = duration;
        this.easing = easing;
    }

    get active(): boolean {
        return this.progress > 0 && this.progress < 1;
    }

    get finished(): boolean {
        return this.progress >= 1;
    }

    update(dt: Duration): void {
        if (this.progress === 1) {
            return;
        }
        this.elapsed.add(dt).min(this.duration);
        const progress = this.elapsed.milliseconds / this.duration.milliseconds;
        this.progress = clamp(progress, 0, 1);
        if (this.easing) {
            this.progress = this.easing(this.progress);
        }
    }

    reset(): void {
        this.elapsed.milliseconds = 0;
        this.progress = 0;
    }

    end(): this {
        this.elapsed.milliseconds = this.duration.milliseconds;
        this.progress = 1;
        return this;
    }
}

export function easeOut2(t: number): number {
    return easeOut(easeOut(t));
    // return 1 - Math.pow(1 - t, 3); // Cubic ease-out, end slow
}

export function easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t); // Basic quadratic ease-out, end slow
}
