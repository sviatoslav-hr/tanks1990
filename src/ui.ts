import { Duration } from './math/duration';
import { Context } from './context';
import { numround } from './math';

export class FPSCounter {
    private lastFPS: string = '0';
    private updateDelay = Duration.zero();
    static readonly FPS_UPDATE_DELAY = new Duration(300);

    update(dt: Duration): void {
        if (this.updateDelay.milliseconds >= 0) {
            this.updateDelay.sub(dt);
        } else {
            this.lastFPS = numround(1000 / dt.milliseconds).toString();
            this.updateDelay.setFrom(FPSCounter.FPS_UPDATE_DELAY);
        }
    }

    draw(ctx: Context): void {
        ctx.setFont('200 36px Helvetica');
        ctx.drawText(this.lastFPS, { x: 10, y: 10 });
    }
}
