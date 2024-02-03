import { Context } from "../context";
import { Rect } from "../math";
import { Transform } from "../math/transform";
import { Vector2 } from "../math/vector";

const ASSETS_URL = "/assets";
const imageCache: Record<string, HTMLImageElement> = {};

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
    private readonly animationDelayMs: number;
    private readonly image: HTMLImageElement;
    private readonly stateMap: SpriteStateMap<K>;

    constructor(opts: SpriteOpts<K>) {
        const { key, frameWidth, frameHeight, animationDelayMs, states } = opts;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animationDelayMs = animationDelayMs ?? 100;
        const src = `${ASSETS_URL}/${key}.png`;
        const cached = imageCache[src];
        if (cached) {
            this.image = cached;
        } else {
            this.image = new Image();
            this.image.src = src;
            imageCache[src] = this.image;
        }
        this.stateMap = {} as SpriteStateMap<K>;
        for (const [index, { name, frames }] of states.entries()) {
            const state = { name, frames, index };
            if (!this.state) {
                this.state = state;
            }
            this.stateMap[name] = state;
        }
    }

    update(dt: number): void {
        this.animationDt += dt;
        if (this.animationDt >= this.animationDelayMs) {
            this.frameIndex++;
            this.animationDt -= this.animationDelayMs;
        }
        if (this.frameIndex > 1) this.frameIndex = 0;
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
        this.frameIndex = 0;
    }
}

export function createTankSprite(key: "tank_yellow" | "tank_green") {
    return new Sprite({
        key: key,
        frameWidth: 64,
        frameHeight: 64,
        animationDelayMs: 100,
        states: [{ name: "moving", frames: 2 }],
    });
}
