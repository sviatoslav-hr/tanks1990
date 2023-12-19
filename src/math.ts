export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function rotateRect(
    rect: Rect,
    cx: number,
    cy: number,
    deg: 0 | 90 | 180 | 270,
): Rect {
    if (deg === 0) {
        return rect;
    }
    if (![0, 90, 180, 270].includes(deg)) {
        console.warn("this rotation degree is not currently supported");
        return rect;
    }
    const { x, y, width, height } = rect;
    const rad = toRadians(deg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const [nx, ny] = rotatePoint(x + width / 2, y + height / 2, cx, cy, deg);
    // NOTE: this is a bit scuft, but for now I want to rotate a tank only using a single point.
    const swap = deg === 90 || deg === 270;
    return {
        x: nx - (swap ? height : width) / 2,
        y: ny - (swap ? width : height) / 2,
        width: swap ? height : width,
        height: swap ? width : height,
    };
}

function rotatePoint(
    x: number,
    y: number,
    cx: number,
    cy: number,
    deg: number,
): [number, number] {
    const radians = toRadians(deg),
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = cos * (x - cx) - sin * (y - cy) + cx,
        ny = cos * (y - cy) + sin * (x - cx) + cy;
    return [nx, ny];
}

function toRadians(deg: number): number {
    return (Math.PI / 180) * deg;
}
