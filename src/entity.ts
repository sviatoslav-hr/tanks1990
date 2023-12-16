import { Color } from "./color";
import { type Context } from "./context";
import { keyboard } from "./keyboard";
import { type Rect, clamp, rotateRect } from "./math";

type BlockOpts = Rect & {
    color: Color;
};

export type Entity = {
    update(dt: number): void;
    draw(ctx: Context): void;
};

export class Block implements Entity {
    public x = 0;
    public y = 0;
    public width = 50;
    public height = 50;
    private readonly color: Color = Color.WHITE;

    constructor({ x, y, width, height, color }: BlockOpts) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    update(_: number): void {}

    draw(ctx: Context): void {
        ctx.setFillColor(this.color);
        ctx.drawRect(this.x, this.y, this.width, this.height);
    }
}

export class Tank implements Entity {
    public x = 0;
    public y = 0;
    public width = 100;
    public height = 100;
    private dx = 0;
    private dy = 0;
    private rotation = 0;
    private showBondary = false;
    private readonly v = 5;

    constructor(
        private screenWidth: number,
        private screenHeight: number,
    ) {}

    update(_: number): void {
        this.handleKeyboard();
        this.x += this.dx;
        this.y += this.dy;
        this.x = clamp(this.x, 0, this.screenWidth - this.width);
        this.y = clamp(this.y, 0, this.screenHeight - this.height);
    }

    draw(ctx: Context): void {
        for (const block of this.createModel()) {
            ctx.setFillColor(block.color);
            const rotated = rotateRect(
                block,
                this.width / 2,
                this.height / 2,
                this.rotation,
            );
            ctx.drawRect(
                this.x + rotated.x,
                this.y + rotated.y,
                rotated.width,
                rotated.height,
            );
        }
        if (this.showBondary) {
            ctx.setStrokeColor(Color.RED);
            ctx.drawBoundary(this);
        }
    }

    private createModel(): BlockOpts[] {
        const blocks: BlockOpts[] = [];
        const wheelWidth = this.width * 0.25;
        const wheelHeight = this.height * 0.75;
        const bodyHeight = wheelHeight * 0.8;
        const headSize = bodyHeight * 0.7;
        const wheelYOffset = this.height - wheelHeight;
        blocks.push({
            x: 0,
            y: wheelYOffset,
            width: wheelWidth,
            height: wheelHeight,
            color: Color.ORANGE_GAMBOGE,
        });
        blocks.push({
            x: 3 * wheelWidth,
            y: wheelYOffset,
            width: wheelWidth,
            height: wheelHeight,
            color: Color.ORANGE_GAMBOGE,
        });
        const bodyYOffset = wheelYOffset + (wheelHeight - bodyHeight) / 2;
        blocks.push({
            x: 0,
            y: bodyYOffset,
            width: this.width,
            height: bodyHeight,
            color: Color.ORANGE_GAMBOGE,
        });
        const headYOffset = bodyYOffset + (bodyHeight - headSize) / 2;
        blocks.push({
            x: wheelWidth,
            y: headYOffset,
            width: this.width - 2 * wheelWidth,
            height: headSize,
            color: Color.ORANGE_SAFFRON,
        });
        const gunWidth = this.width / 15;
        blocks.push({
            x: (this.width - gunWidth) / 2,
            y: 0,
            width: gunWidth,
            height: headYOffset,
            color: Color.WHITE_NAVAJO,
        });
        return blocks;
    }

    private handleKeyboard(): void {
        this.dy = 0;
        this.dx = 0;
        if (keyboard.pressed.KeyA) {
            this.dx = -this.v;
            this.rotation = 270;
        }
        if (keyboard.pressed.KeyD) {
            this.dx = this.v;
            this.rotation = 90;
        }
        if (keyboard.pressed.KeyW) {
            this.dy = -this.v;
            this.rotation = 0;
        }
        if (keyboard.pressed.KeyS) {
            this.dy = this.v;
            this.rotation = 180;
        }
        this.showBondary = !!keyboard.pressed.KeyB;
    }
}
