export type KeyCode =
    | "KeyQ"
    | "KeyW"
    | "KeyR"
    | "KeyA"
    | "KeyS"
    | "KeyD"
    | "KeyF"
    | "KeyB"
    | "Backquote"
    | "Space"
    | "Escape";
export type KeysState = Partial<Record<KeyCode, boolean>>;
export type KeyHandler = (event: Event, code: KeyCode) => void;

export class Keyboard {
    private currentPressed: KeysState = {};
    private previousPressed: KeysState = {};
    private keydownHandlers: Partial<Record<KeyCode, KeyHandler[]>> = {};

    isPressed(code: KeyCode): boolean {
        return !this.previousPressed[code] && !!this.currentPressed[code];
    }

    isDown(code: KeyCode): boolean {
        return !!this.currentPressed[code];
    }

    isReleased(code: KeyCode): boolean {
        return !!this.previousPressed[code] && !this.currentPressed[code];
    }

    isUp(code: KeyCode): boolean {
        return !this.currentPressed[code];
    }

    listen(element: HTMLElement) {
        element.addEventListener("keydown", (ev) => {
            const code = ev.code as KeyCode;
            this.setPressed(code);
            for (const handler of this.keydownHandlers[code] ?? []) {
                handler(ev, code);
            }
        });
        element.addEventListener("keyup", (ev) =>
            this.setReleased(ev.code as KeyCode),
        );
    }

    reset() {
        this.previousPressed = { ...this.currentPressed };
    }

    private setPressed(code: KeyCode) {
        this.currentPressed[code] = true;
    }

    private setReleased(code: KeyCode) {
        this.currentPressed[code] = false;
    }

    // TODO: remove it, use isPressed()
    onKeydown(code: KeyCode, handler: KeyHandler): void {
        const handlers = this.keydownHandlers[code];
        if (handlers) {
            handlers.push(handler);
        } else {
            this.keydownHandlers[code] = [handler];
        }
    }
}

export const keyboard = new Keyboard();
