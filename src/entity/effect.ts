import { Color } from "../color";
import { Context } from "../context";
import { Rect } from "../math";
import { assert } from "../utils";
import { scaleMovement } from "./core";

export class ExplosionEffect {
    private circleSize = 0;

    private constructor(
        private boundary: Rect,
        private particles: Particle[]
    ) { }

    static fromImageData(image: ImageData, boundary: Rect, particleSize: number): ExplosionEffect | null {
        const { width, height } = boundary;
        assert(image.width === width);
        assert(image.height === height);
        const particles: Particle[] = [];
        // const cx = boundary.x + width / 2;
        // const cy = boundary.y + height / 2;
        const cx = boundary.x;
        const cy = boundary.y;
        for (let y = 0; y < height; y += particleSize) {
            for (let x = 0; x < width; x += particleSize) {
                const index = (y * width + x) * 4;
                const red = image.data[index];
                const green = image.data[index + 1];
                const blue = image.data[index + 2];
                const alpha = image.data[index + 3];
                if (red == null || green == null || blue == null || alpha == null) {
                    console.warn('Invalid image data');
                    return null;
                }
                if (!alpha) continue;
                const color = `rgb(${red},${green},${blue})`;
                const particle = new Particle(x + boundary.x, y + boundary.y, particleSize, particleSize, color)
                if (particle.x - width / 2 < cx) particle.vx *= -1;
                if (particle.y - width / 2 < cy) particle.vy *= -1;
                particles.push(particle);
            }
        }
        return new ExplosionEffect({ ...boundary }, particles);
    }

    draw(ctx: Context): void {
        const cx = this.boundary.x + this.boundary.width / 2;
        const cy = this.boundary.y + this.boundary.height / 2;
        ctx.ctx.shadowColor = Color.ORANGE_PHILIPPINE;
        ctx.ctx.shadowBlur = this.circleSize;
        ctx.setFillColor(Color.ORANGE_PHILIPPINE);
        ctx.fillCircle(cx, cy, this.circleSize);
        ctx.ctx.shadowColor = 'transparent';
        ctx.ctx.shadowBlur = 0;
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    update(dt: number): void {
        this.circleSize += scaleMovement(this.boundary.width * .3 * 5, dt);
        for (const p of this.particles) {
            p.update(dt);
        }
    }
}

class Particle {
    vx: number;
    vy: number;

    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public color: string,
    ) {
        const v = 100;
        this.vx = Math.random() * v;
        this.vy = Math.random() * v;
    }

    draw(ctx: Context): void {
        ctx.setFillColor(this.color);
        ctx.drawRect(this.x, this.y, this.width, this.height);
    }

    update(dt: number): void {
        this.x += scaleMovement(this.vx, dt);
        this.y += scaleMovement(this.vy, dt);
    }
}
