export type KeyCode =
    | "KeyW"
    | "KeyS"
    | "KeyA"
    | "KeyD"
    | "KeyF"
    | "KeyB"
    | "KeyQ"
    | "KeyR"
    | "Space"
    | "Escape";
export type KeysState = Partial<Record<KeyCode, boolean>>;
export type KeyHandler = (code: KeyCode) => void;

export class Keyboard {
    static pressed: KeysState = {};
    private static keydownHandlers: Partial<Record<KeyCode, KeyHandler[]>> = {};

    static listen(element: HTMLElement) {
        element.addEventListener("keydown", (ev) => {
            const code = ev.code as KeyCode;
            this.setPressed(code);
            for (const handler of this.keydownHandlers[code] ?? []) {
                handler(code);
            }
        });
        element.addEventListener("keyup", (ev) =>
            this.setReleased(ev.code as KeyCode),
        );
    }

    static setPressed(code: KeyCode) {
        this.pressed[code] = true;
    }

    static setReleased(code: KeyCode) {
        this.pressed[code] = false;
    }

    static onKeydown(code: KeyCode, handler: KeyHandler): void {
        const handlers = this.keydownHandlers[code];
        if (handlers) {
            handlers.push(handler);
        } else {
            this.keydownHandlers[code] = [handler];
        }
    }
}
