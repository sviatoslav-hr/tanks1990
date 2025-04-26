import {CustomElement, HTMLElementOptions, ReactiveElement, css, div} from '#/html';
import {numround} from '#/math';
import {Duration} from '#/math/duration';

// NOTE: Inspired by https://github.com/mrdoob/stats.js/blob/28632bd87e0ea56acafc9b8779d813eb95e62c08/src/Stats.js

@CustomElement('fps-monitor')
export class FPSMonitor extends ReactiveElement {
    public visible = true;
    private lastFPS: string = '0';
    private updateDelay = Duration.zero();
    private textElement = div({textContent: 'FPS: 60'});

    private currentPanelId = 0;
    private beginTime = 0;
    private prevTime = 0;
    private framesCount = 0;
    private fpsPanel: StatsPanel;
    private msPanel: StatsPanel;
    private memPanel: StatsPanel | undefined;
    private panels: StatsPanel[] = [];

    static readonly FPS_UPDATE_DELAY = new Duration(300);

    constructor(options?: HTMLElementOptions) {
        super(options);
        this.addEventListener(
            'click',
            (event) => {
                event.preventDefault();
                this.selectPanel(++this.currentPanelId % this.panels.length);
            },
            false,
        );

        this.beginTime = (performance || Date).now();
        this.prevTime = this.beginTime;
        this.framesCount = 0;

        this.fpsPanel = this.addPanel(new StatsPanel('FPS', '#0ff', '#002'));
        this.msPanel = this.addPanel(new StatsPanel('MS', '#0f0', '#020'));
        if (isMemoryInfoAvailable()) {
            this.memPanel = this.addPanel(new StatsPanel('MB', '#f08', '#201'));
        }

        this.selectPanel(0);
    }

    protected override render(): HTMLElement {
        return div({
            className: ['monitor'],
            children: [
                this.textElement,
                div({
                    children: this.panels.map((p) => p.dom),
                }),
            ],
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .monitor {
                border: 1px solid black;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                cursor: pointer;
                opacity: 0.9;
                z-index: 10000;
                user-select: none;
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
        this.beginTime = this.endMeasuring();
    }

    show(): void {
        this.visible = true;
        this.style.display = 'block';
    }

    hide(): void {
        this.visible = false;
        this.style.display = 'none';
    }

    private addPanel(p: StatsPanel): StatsPanel {
        this.panels.push(p);
        return p;
    }

    private selectPanel(id: number) {
        assert(0 <= id && id < this.panels.length);
        for (const [i, panel] of this.panels.entries()) {
            panel.dom.style.display = i === id ? 'block' : 'none';
        }
        this.currentPanelId = id;
    }

    beginMeasuring() {
        this.beginTime = (performance || Date).now();
    }

    endMeasuring() {
        this.framesCount++;
        const time = (performance || Date).now();
        this.msPanel.update(time - this.beginTime, 200);

        // TODO: This is not ideal because it does not show spikes for single frames
        if (time >= this.prevTime + 1000) {
            this.fpsPanel.update((this.framesCount * 1000) / (time - this.prevTime), 100);
            this.prevTime = time;
            this.framesCount = 0;

            if (this.memPanel) {
                const memory = getCurrentMemory();
                const mb = 1024 * 1024;
                this.memPanel.update(memory.usedJSHeapSize / mb, memory.jsHeapSizeLimit / mb);
            }
        }

        return time;
    }
}

function isMemoryInfoAvailable() {
    return Boolean((self.performance as any)?.memory);
}

function getCurrentMemory() {
    assert(isMemoryInfoAvailable());
    // TODO: Consider using performance.measureUserAgentSpecificMemory()
    var memory = (performance as any).memory;
    type MenoryInfo = {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    };
    return memory as MenoryInfo;
}

class StatsPanel {
    private min: number;
    private max: number;
    dom: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private readonly pixelRatio: number;
    private readonly width: number;
    private readonly height: number;
    private readonly textX: number;
    private readonly textY: number;
    private readonly graphX: number;
    private readonly graphY: number;
    private readonly graphWidth: number;
    private readonly graphHeight: number;

    constructor(
        readonly name: string,
        readonly fg: string,
        readonly bg: string,
    ) {
        this.min = Infinity;
        this.max = 0;
        const PR = Math.round(window.devicePixelRatio || 1);
        this.pixelRatio = PR;
        this.width = 80 * PR;
        this.height = 48 * PR;
        this.textX = 3 * PR;
        this.textY = 2 * PR;
        this.graphX = 3 * PR;
        this.graphY = 15 * PR;
        this.graphWidth = 74 * PR;
        this.graphHeight = 30 * PR;

        const canvas = document.createElement('canvas');
        this.dom = canvas;
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.cssText = 'width:80px;height:48px';

        const context = canvas.getContext('2d');
        assert(context);
        this.context = context;
        context.font = 'bold ' + 9 * PR + 'px Helvetica,Arial,sans-serif';
        context.textBaseline = 'top';

        context.fillStyle = bg;
        context.fillRect(0, 0, this.width, this.height);

        context.fillStyle = fg;
        context.fillText(name, this.textX, this.textY);
        context.fillRect(this.graphX, this.graphY, this.graphWidth, this.graphHeight);

        context.fillStyle = bg;
        context.globalAlpha = 0.9;
        context.fillRect(this.graphX, this.graphY, this.graphWidth, this.graphHeight);
    }

    update(value: number, maxValue: number) {
        this.min = Math.min(this.min, value);
        this.max = Math.max(this.max, value);

        this.context.fillStyle = this.bg;
        this.context.globalAlpha = 1;
        this.context.fillRect(0, 0, this.width, this.graphY);
        this.context.fillStyle = this.fg;
        this.context.fillText(
            Math.round(value) +
                ' ' +
                this.name +
                ' (' +
                Math.round(this.min) +
                '-' +
                Math.round(this.max) +
                ')',
            this.textX,
            this.textY,
        );

        this.context.drawImage(
            this.dom,
            this.graphX + this.pixelRatio,
            this.graphY,
            this.graphWidth - this.pixelRatio,
            this.graphHeight,
            this.graphX,
            this.graphY,
            this.graphWidth - this.pixelRatio,
            this.graphHeight,
        );

        this.context.fillRect(
            this.graphX + this.graphWidth - this.pixelRatio,
            this.graphY,
            this.pixelRatio,
            this.graphHeight,
        );

        this.context.fillStyle = this.bg;
        this.context.globalAlpha = 0.9;
        this.context.fillRect(
            this.graphX + this.graphWidth - this.pixelRatio,
            this.graphY,
            this.pixelRatio,
            Math.round((1 - value / maxValue) * this.graphHeight),
        );
    }
}
