import {ui, HTMLElementOptions, ReactiveElement, css, CustomElement} from '#/html';

@CustomElement('notification-bar')
class NotificationBar extends ReactiveElement {
    container: HTMLElement | null = null;
    constructor(options?: HTMLElementOptions) {
        super(options);
    }

    protected render(): HTMLElement | HTMLElement[] {
        return (this.container = ui.div({
            className: 'notification-bar',
            id: 'notification-bar',
            children: [],
        }));
    }
    protected styles(): HTMLStyleElement | null {
        return css`
            .notification-bar {
                position: fixed;
                top: 0;
                left: 50%;
                width: fit-content;
                height: auto;
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                z-index: 1000;
                transform: translateX(-50%);
                user-select: none;
                pointer-events: none;
            }
            .notification-bar:empty {
                display: none;
            }
        `;
    }

    addNotification(message: string, kind: NotificationKind, timeoutMs = 2000, safe = true): void {
        if (this.container) {
            const notificationItem = new NotificationItem({message, kind, timeoutMs});
            this.container?.append(notificationItem);
        } else if (safe) {
            setTimeout(() => {
                this.addNotification(message, kind, timeoutMs, false);
            }, 100);
        }
    }
}

type NotificationKind = 'info' | 'warning' | 'error';

interface NotificationItemOptions extends HTMLElementOptions {
    timeoutMs?: number;
    message: string;
    kind: NotificationKind;
}

@CustomElement('notification-item')
class NotificationItem extends ReactiveElement {
    private readonly message: string;
    private readonly kind: NotificationKind;
    private container: HTMLElement | null = null;
    private readonly fadeOutMs = 500;

    constructor(options: NotificationItemOptions) {
        super(options);
        this.message = options.message;
        this.kind = options.kind;
        const timeoutMs = options.timeoutMs ?? 3000;
        setTimeout(() => {
            this.container?.classList.add('notification-item--hidden');
            setTimeout(() => this.remove(), this.fadeOutMs);
        }, timeoutMs);
    }

    protected render(): HTMLElement | HTMLElement[] {
        return (this.container = ui.div({
            className: ['notification-item', 'notification-item--' + this.kind],
            children: [
                ui.div({
                    textContent: this.message,
                    className: 'notification-text',
                }),
            ],
        }));
    }

    protected styles(): HTMLStyleElement | null {
        return css`
            .notification-item {
                color: white;
                transition: all ${this.fadeOutMs.toString()}ms ease-in-out;
            }
            .notification-item--info {
                color: white;
            }
            .notification-item--warning {
                color: orange;
            }
            .notification-item--error {
                color: red;
            }
            .notification-item--hidden {
                opacity: 0;
                transform: translateY(-100%);
            }
        `;
    }
}

// NOTE: Keep it null for tests in Node.js.
const notificationsBar = new NotificationBar();

export function getNotificationBar() {
    return notificationsBar;
}

// TODO: Provide a way to pass an AbortController to the notification
export function notify(message: string): void {
    message = normalizeMessage(message);
    notificationsBar?.addNotification(message, 'info', 2000);
}

export function notifyWarning(message: string): void {
    message = normalizeMessage(message);
    notificationsBar?.addNotification(message, 'warning', 3000);
}

// TODO: When there is too many spamming errors, we should stop showing them individually
// and instead show a single error message with a count of how many errors happened
export function notifyError(message: string): void {
    message = normalizeMessage(message);
    notificationsBar?.addNotification(message, 'error', 5000);
}

function normalizeMessage(message: string): string {
    const newLineIndex = message.indexOf('\n');
    if (newLineIndex !== -1) {
        message = message.substring(0, newLineIndex);
    }
    if (message.length > 100) {
        message = message.substring(0, 100) + '...';
    }
    return message;
}
