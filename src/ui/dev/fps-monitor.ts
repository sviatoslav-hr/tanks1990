import {numround} from '#/math';
import {Duration} from '#/math/duration';
import {CustomElement, HTMLElementOptions, ReactiveElement, css, ui} from '#/ui/html';

// NOTE: Inspired by https://github.com/mrdoob/stats.js/blob/28632bd87e0ea56acafc9b8779d813eb95e62c08/src/Stats.js

@CustomElement('fps-monitor')
export class FPSMonitor extends ReactiveElement {
    public visible = true;
    public paused = false;

    private currentPanelId = 0;
    private beginTime = 0;
    private lastFrameTime = 0;
    private framesBeginTime = 0;
    private framesCount = 0;
    private fpsPanel: StatsPanel;
    private updateMsPanel: StatsPanel;
    private frameMsPanel: StatsPanel;
    private memPanel: StatsPanel | undefined;
    private panels: StatsPanel[] = [];

    static readonly DISPLAY_DELAY = Duration.milliseconds(300);
    private displayDelay = FPSMonitor.DISPLAY_DELAY.clone();
    private initialDelay = Duration.milliseconds(1500);

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

        this.addEventListener(
            'contextmenu',
            (event) => {
                event.preventDefault();
                this.reset();
            },
            false,
        );

        this.beginTime = (performance || Date).now();

        this.fpsPanel = this.addPanel(
            new StatsPanel({
                name: 'FPS',
                fgColor: '#0ff',
                bgColor: '#002',
                maxValue: 999,
                minValue: 1,
                ignoreOutOfRange: true,
            }),
        );
        this.frameMsPanel = this.addPanel(
            new StatsPanel({
                name: 'Frame MS',
                fgColor: '#0f0',
                bgColor: '#020',
                precision: 1,
                maxValue: 69.9,
            }),
        );
        this.updateMsPanel = this.addPanel(
            new StatsPanel({
                name: 'Update MS',
                fgColor: '#fd0',
                bgColor: '#020',
                precision: 1,
                minValue: 0.1,
                maxValue: 19.9,
            }),
        );
        if (isMemoryInfoAvailable()) {
            this.memPanel = this.addPanel(
                new StatsPanel({name: 'MB', fgColor: '#f08', bgColor: '#201'}),
            );
        }

        this.selectPanel(0);
    }

    protected override render(): HTMLElement[] {
        return [ui.div({className: ['monitor']}, ...this.panels.map((p) => p.dom))];
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

    begin() {
        this.beginTime = (performance || Date).now();
    }

    end() {
        if (this.paused) {
            return;
        }
        const timeNow = (performance || Date).now();
        const frameTime = timeNow - this.lastFrameTime;
        // NOTE: Prevent initial loading from "breaking" charts.
        if (this.initialDelay.positive) {
            this.initialDelay.milliseconds -= frameTime;
            return timeNow;
        }
        const isValidFrameTime =
            this.beginTime !== 0 && this.lastFrameTime !== 0 && frameTime < 200;
        if (isValidFrameTime) {
            this.frameMsPanel.update(frameTime, 19.9);
            const updateTime = timeNow - this.beginTime;
            this.updateMsPanel.update(updateTime);
            this.framesCount++;
            this.displayDelay.milliseconds -= frameTime;
        } else if (this.framesBeginTime !== 0) {
            this.displayDelay.setFrom(FPSMonitor.DISPLAY_DELAY);
            this.framesBeginTime = timeNow;
            this.framesCount = 0;
        }

        if (!this.displayDelay.positive) {
            const allFramesTime = timeNow - this.framesBeginTime;
            const avgFramesCount = (this.framesCount * 1000) / allFramesTime;
            if (avgFramesCount && this.framesBeginTime > 0) {
                this.fpsPanel.update(avgFramesCount, 200);
            }
            this.framesBeginTime = timeNow;
            this.framesCount = 0;
            this.displayDelay.add(FPSMonitor.DISPLAY_DELAY);
            if (!this.displayDelay.positive) {
                // NOTE: Workaround in case delay is too negative
                this.displayDelay.setFrom(FPSMonitor.DISPLAY_DELAY);
            }
            if (isValidFrameTime && this.memPanel) {
                const memory = getCurrentMemory();
                const mb = 1024 * 1024;
                this.memPanel.update(memory.usedJSHeapSize / mb);
                // this.memPanel.update(memory.usedJSHeapSize / mb, memory.jsHeapSizeLimit / mb);
            }
        }

        this.lastFrameTime = timeNow;
        this.beginTime = 0;
        return timeNow;
    }

    reset() {
        for (const panel of this.panels) {
            panel.reset();
        }
        this.beginTime = 0;
        this.lastFrameTime = 0;
        this.framesBeginTime = 0;
        this.framesCount = 0;
        this.displayDelay.setFrom(FPSMonitor.DISPLAY_DELAY);
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

interface StatsPanelOptions {
    name: string;
    fgColor: string;
    bgColor: string;
    precision?: number;
    maxValue?: number;
    minValue?: number;
    ignoreOutOfRange?: boolean;
}

// TODO: Convert into ReactiveElement?
class StatsPanel {
    public name: string;
    public fgColor: string;
    public bgColor: string;
    public precision: number;
    private minForced?: number;
    private maxForced?: number;
    private ignoreOutOfRange: boolean;
    public max: number;
    public min: number;
    dom: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly pixelRatio: number;
    private readonly width: number;
    private readonly height: number;
    private readonly textX: number;
    private readonly textY: number;
    private readonly graphX: number;
    private readonly graphY: number;
    private readonly graphWidth: number;
    private readonly graphHeight: number;

    constructor(options: StatsPanelOptions) {
        const {
            name,
            fgColor: fg,
            bgColor: bg,
            precision = 0,
            minValue: minForced,
            maxValue: maxForced,
            ignoreOutOfRange = false,
        } = options;
        this.name = name;
        this.fgColor = fg;
        this.bgColor = bg;
        this.precision = precision;
        this.minForced = minForced;
        this.maxForced = maxForced;
        this.ignoreOutOfRange = ignoreOutOfRange;
        this.min = Infinity;
        this.max = 0;
        const PR = Math.round(window.devicePixelRatio || 1);
        this.pixelRatio = PR;
        const paddingX = 3 * PR;
        const paddingY = 2 * PR;
        const fontSize = 24 * PR;
        this.width = 320 * PR;
        this.height = 150 * PR;
        this.textX = paddingX;
        this.textY = paddingY;
        this.graphX = paddingX;
        this.graphY = paddingY + fontSize + paddingY;
        this.graphWidth = this.width - 2 * paddingX;
        this.graphHeight = this.height - this.graphY - paddingY;

        const canvas = document.createElement('canvas');
        this.dom = canvas;
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.cssText = `width:${this.width}px;height:${this.height}px`;

        const ctx = canvas.getContext('2d');
        assert(ctx);
        this.ctx = ctx;
        ctx.font = 'bold ' + fontSize + 'px Helvetica,Arial,sans-serif';
        ctx.textBaseline = 'top';

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = fg;
        ctx.fillText(name, this.textX, this.textY);
        ctx.fillRect(this.graphX, this.graphY, this.graphWidth, this.graphHeight);

        ctx.fillStyle = bg;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(this.graphX, this.graphY, this.graphWidth, this.graphHeight);
    }

    update(value: number, maxValue: number = this.max) {
        if (this.minForced !== undefined && value <= this.minForced) {
            if (this.ignoreOutOfRange) {
                return;
            }
            value = this.minForced;
        }
        if (this.maxForced !== undefined && value >= this.maxForced) {
            if (this.ignoreOutOfRange) {
                return;
            }
            value = this.maxForced;
        }
        // PERF: Could be better to store already rounded values
        this.min = Math.min(this.min, value);
        this.max = Math.max(this.max, value);

        this.ctx.fillStyle = this.bgColor;
        this.ctx.globalAlpha = 1;
        this.ctx.fillRect(0, 0, this.width, this.graphY);
        this.ctx.fillStyle = this.fgColor;
        if (this.name.includes('MS')) {
            value = value;
        }
        const vv = numround(value, this.precision);
        const valueText = vv.toFixed(this.precision);
        const minText = numround(this.min, this.precision).toFixed(this.precision);
        const maxText = numround(this.max, this.precision).toFixed(this.precision);
        const text = `${this.name}: ${valueText} [${minText}-${maxText}]`;
        this.ctx.fillText(text, this.textX, this.textY);

        const pxSize = this.pixelRatio;
        this.ctx.drawImage(
            this.dom,
            this.graphX + pxSize,
            this.graphY,
            this.graphWidth - pxSize,
            this.graphHeight,
            this.graphX,
            this.graphY,
            this.graphWidth - pxSize,
            this.graphHeight,
        );

        this.ctx.fillRect(
            this.graphX + this.graphWidth - this.pixelRatio,
            this.graphY,
            this.pixelRatio,
            this.graphHeight,
        );

        this.ctx.fillStyle = this.bgColor;
        this.ctx.globalAlpha = 0.9;
        this.ctx.fillRect(
            this.graphX + this.graphWidth - this.pixelRatio,
            this.graphY,
            this.pixelRatio,
            (1 - value / maxValue) * this.graphHeight,
        );
    }

    reset() {
        this.min = Infinity;
        this.max = 0;
        this.ctx.fillStyle = this.bgColor;
        this.ctx.globalAlpha = 1;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = this.fgColor;
        this.ctx.fillRect(this.graphX, this.graphY, this.graphWidth, this.graphHeight);
        this.ctx.globalAlpha = 0.9;
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(this.graphX, this.graphY, this.graphWidth, this.graphHeight);
    }
}
