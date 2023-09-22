const WIDTH = 800;
const HEIGHT = 600;

type Context = CanvasRenderingContext2D;

export function createCanvas(): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = WIDTH;
  element.height = HEIGHT;
  return element;
}

export function startAnimation(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx == null) {
    console.error("No context found");
    return;
  }
  let x = 1;
  let y = 1;
  let dx = 1;
  let dy = 1;
  const width = 100;
  const height = 100;

  const animate = function(): void {
    clearScreen(ctx);
    drawRect(ctx, x, y, width, height, 'red');
    if (x <= 0 || x + width >= canvas.width) {
      dx *= -1;
    }
    if (y <= 0 || y + height >= canvas.height) {
      dy *= -1;
    }
    x += dx
    y += dy;
    window.requestAnimationFrame(animate);
  }
  window.requestAnimationFrame(animate);
}

function drawRect(ctx: Context, x: number, y: number, width: number, height: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height)
}

function clearScreen(ctx: Context): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}
