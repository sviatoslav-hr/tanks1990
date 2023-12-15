export type KeyCode = "KeyW" | "KeyS" | "KeyA" | "KeyD" | "Space";
export type KeysState = Partial<Record<KeyCode, boolean>>;

export type Keyboard = {
    readonly pressed: KeysState;
    setPressed(code: KeyCode): void;
    setReleased(code: KeyCode): void;
};

export const Keyboard: Keyboard = {
    pressed: {},
    setPressed(code) {
        this.pressed[code] = true;
    },
    setReleased(code) {
        this.pressed[code] = false;
    },
};
