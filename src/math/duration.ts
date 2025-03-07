export class Duration {
    constructor(public milliseconds: number) {}

    static since(start: number): Duration {
        return new Duration(performance.now() - start);
    }

    static zero(): Duration {
        return new Duration(0);
    }

    static milliseconds(milliseconds: number): Duration {
        return new Duration(milliseconds);
    }

    get positive(): boolean {
        return this.milliseconds > 0;
    }

    get seconds(): number {
        return this.milliseconds / 1000;
    }

    get minutes(): number {
        return this.seconds / 60;
    }

    get hours(): number {
        return this.minutes / 60;
    }

    get days(): number {
        return this.hours / 24;
    }

    get weeks(): number {
        return this.days / 7;
    }

    get months(): number {
        return this.days / 30;
    }

    get years(): number {
        return this.days / 365;
    }

    setFrom(other: Duration): Duration {
        return this.setMilliseconds(other.milliseconds);
    }

    setMilliseconds(milliseconds: number): Duration {
        this.milliseconds = milliseconds;
        return this;
    }

    max(other: Duration | number): Duration {
        const milliseconds =
            typeof other === 'number' ? other : other.milliseconds;
        this.milliseconds = Math.max(this.milliseconds, milliseconds);
        return this;
    }

    min(other: Duration | number): Duration {
        const milliseconds =
            typeof other === 'number' ? other : other.milliseconds;
        this.milliseconds = Math.min(this.milliseconds, milliseconds);
        return this;
    }

    add(other: Duration) {
        this.milliseconds += other.milliseconds;
        return this;
    }

    sub(other: Duration) {
        this.milliseconds -= other.milliseconds;
        return this;
    }

    mul(factor: number) {
        this.milliseconds *= factor;
        return this;
    }

    isMoreThan(other: Duration): boolean {
        return this.milliseconds > other.milliseconds;
    }

    clone(): Duration {
        return new Duration(this.milliseconds);
    }

    toHumanString(): string {
        const secs = Math.floor(this.seconds);
        const minutes = Math.floor(this.minutes);
        if (minutes) {
            const secsRest = Math.floor(secs - minutes * 60);
            return `${minutes}m ${secsRest}s`;
        }
        if (secs) {
            return `${secs}s`;
        }
        return `${Math.floor(this.milliseconds)}ms`;
    }
}
