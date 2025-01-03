import {CustomElement, ReactiveElement, css, div} from '#/html';
import {numround} from '#/math';
import {Duration} from '#/math/duration';

@CustomElement('fps-monitor')
export class FPSMonitor extends ReactiveElement {
    private lastFPS: string = '0';
    private updateDelay = Duration.zero();
    private textElement = div({textContent: 'FPS: 60'});
    static readonly FPS_UPDATE_DELAY = new Duration(300);
    public visible = true;

    protected override render(): HTMLElement {
        // TODO: make this as a canvas
        // TODO: add fps graph (see three.js/examples/jsm/libs/stats.module.js)
        return div({
            className: ['monitor'],
            children: [this.textElement],
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .monitor {
                padding: 0.5rem;
                border: 1px solid red;
            }
        `;
    }

    update(dt: Duration): void {
        if (this.updateDelay.milliseconds >= 0) {
            this.updateDelay.sub(dt);
        } else {
            this.lastFPS = numround(1000 / dt.milliseconds).toString();
            this.updateDelay.setFrom(FPSMonitor.FPS_UPDATE_DELAY);
            if (this.visible) {
                this.textElement.textContent = `FPS: ${this.lastFPS}`;
            }
        }
    }

    show(): void {
        this.visible = true;
        this.style.opacity = '1';
        this.style.pointerEvents = 'auto';
    }

    hide(): void {
        this.visible = false;
        this.style.opacity = '0';
        this.style.pointerEvents = 'none';
    }
}
