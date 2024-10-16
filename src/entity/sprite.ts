import { Context } from '../context';
import { Rect } from '../math';
import { Transform } from '../math/transform';
import { Vector2 } from '../math/vector';

const ASSETS_URL = './assets';
// TODO: consider using a simpler data type for images instead of HTMLImageElement
const imageCache: Record<string, HTMLImageElement> = {};

export function getCachedImage(src: string): HTMLImageElement | undefined {
    return imageCache[src];
}

export function setCachedImage(src: string, image: HTMLImageElement): void {
    if (imageCache[src]) {
        console.warn(`WARN: overwriting cached image for "${src}"`);
    }
    imageCache[src] = image;
}

type SpriteOpts<K extends string> = {
    key: string;
    frameWidth: number;
    frameHeight: number;
    animationDelayMs?: number; // default 100
    states: { name: K; frames: number }[];
};

type SpriteState<K extends string> = { name: K; index: number; frames: number };
type SpriteStateMap<K extends string> = { [Key in K]: SpriteState<Key> };

export class Sprite<K extends string> {
    private frameIndex = 0;
    private frameWidth = 0;
    private frameHeight = 0;
    private animationDt = 0;
    private state?: SpriteState<K>;
    private readonly stateKeys: readonly K[];
    private readonly animationDelayMs: number;
    private readonly image: HTMLImageElement;
    private readonly stateMap: SpriteStateMap<K>;

    constructor(opts: SpriteOpts<K>) {
        const { key, frameWidth, frameHeight, animationDelayMs, states } = opts;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animationDelayMs = animationDelayMs ?? 100;
        const src = `${ASSETS_URL}/${key}.png`;
        const cached = getCachedImage(src);
        if (cached) {
            this.image = cached;
        } else {
            this.image = new Image();
            this.image.alt = key;
            this.image.src = src;
            setCachedImage(src, this.image);
        }
        this.stateMap = {} as SpriteStateMap<K>;
        for (const [index, { name, frames }] of states.entries()) {
            const state = { name, frames, index };
            if (!this.state) {
                this.state = state;
            }
            this.stateMap[name] = state;
        }
        this.stateKeys = states.map((s) => s.name);
    }

    update(dt: number): void {
        this.animationDt += dt;
        if (this.animationDt >= this.animationDelayMs) {
            this.frameIndex++;
            this.animationDt -= this.animationDelayMs;
        }
        const maxFrames = this.state?.frames ?? 1;
        if (this.frameIndex > maxFrames - 1) this.frameIndex = 0;
    }

    draw(ctx: Context, boundary: Rect, rotationDeg = 0): void {
        if (!this.state) return;
        // NOTE: set origin at the center of tank for proper rotation
        const translation = new Vector2(
            boundary.x + boundary.width / 2,
            boundary.y + boundary.height / 2,
        );
        ctx.setTransform(Transform.makeTranslation(translation));
        ctx.rotate(rotationDeg);
        // NOTE: draw the image respecting the moved origin
        ctx.drawImage(
            this.image,
            this.frameWidth * this.frameIndex,
            this.state.index * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            -boundary.width / 2,
            -boundary.height / 2,
            boundary.width,
            boundary.height,
        );
        ctx.resetTransform();
        ctx.rotate(0);
    }

    selectState(state: K): void {
        this.state = this.stateMap[state];
        this.animationDt = 0;
        this.frameIndex = 0;
    }

    reset(): void {
        const stateKey = this.stateKeys[0];
        if (!stateKey) {
            console.warn(`WARN: no states found for sprite ${this.image.alt}`);
            return;
        }
        this.selectState(stateKey);
    }
}

export function createShieldSprite() {
    return new Sprite({
        key: 'shield',
        frameWidth: 64,
        frameHeight: 64,
        animationDelayMs: 100,
        states: [{ name: 'flowing', frames: 6 }],
    });
}

export function createTankSprite(key: 'tank_yellow' | 'tank_green') {
    return new Sprite({
        key: key,
        frameWidth: 64,
        frameHeight: 64,
        animationDelayMs: 100,
        states: [{ name: 'moving', frames: 2 }],
    });
}

export function createStaticSprite(
    opts: Omit<SpriteOpts<'static'>, 'states'>,
): Sprite<'static'> {
    const states = [{ name: 'static', frames: 1 } as const];
    return new Sprite({ ...opts, states });
}
