import { Context } from "../context";
import { Rect } from "../math";

const ASSETS_URL = "/assets";

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
    private static images: Record<string, HTMLImageElement> = {};

    constructor(opts: SpriteOpts<K>) {
        const { key, frameWidth, frameHeight, animationDelayMs, states } = opts;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animationDelayMs = animationDelayMs ?? 100;
        const src = `${ASSETS_URL}/${key}.png`;
        const cached = Sprite.images[src];
        if (cached) {
            this.image = cached;
        } else {
            this.image = new Image();
            this.image.src = src;
            Sprite.images[src] = this.image;
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

    draw(ctx: Context, transform: Rect, rotationDeg = 0): void {
        if (!this.state) return;
        // NOTE: set origin at the center of tank for proper rotation
        ctx.ctx.setTransform(
            1,
            0,
            0,
            1,
            transform.x + transform.width / 2,
            transform.y + transform.height / 2,
        );
        ctx.rotate(rotationDeg);
        // NOTE: draw the image respecting the moved origin
        ctx.drawImage(
            this.image,
            this.frameWidth * this.frameIndex,
            this.state.index * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            -transform.width / 2,
            -transform.height / 2,
            transform.width,
            transform.height,
        );
        ctx.ctx.setTransform(1, 0, 0, 1, 0, 0);
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
