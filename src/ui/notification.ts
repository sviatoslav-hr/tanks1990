import {computed, effect, ReadableSignal, signal} from '#/signals';
import {UIComponent, UIContext} from '#/ui/core';

interface NotifyOptions {
    timeoutMs?: number;
}

// TODO: Provide a way to pass an AbortController to the notification
export function notify(message: string, options?: NotifyOptions): void {
    message = normalizeMessage(message);
    const timeoutMs = options?.timeoutMs ?? 2000;
    appendNotification({message, kind: 'info', timeoutMs});
}

export function notifyWarning(message: string, options?: NotifyOptions): void {
    message = normalizeMessage(message);
    const timeoutMs = options?.timeoutMs ?? 3000;
    appendNotification({message, kind: 'warning', timeoutMs});
}

// TODO: When there is too many spamming errors, we should stop showing them individually
// and instead show a single error message with a count of how many errors happened
export function notifyError(message: string, options?: NotifyOptions): void {
    message = normalizeMessage(message);
    const timeoutMs = options?.timeoutMs ?? 5000;
    appendNotification({message, kind: 'error', timeoutMs});
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

type NotificationKind = 'info' | 'warning' | 'error';

interface NotificationOptions {
    message: string;
    kind: NotificationKind;
    timeoutMs?: number;
}

interface Notification extends NotificationOptions {
    hidden: boolean;
    createdAt: number;
}

const notifications = signal<Notification[]>([]);
const FADE_OUT_DURATION_MS = 500;

function appendNotification(options: NotificationOptions): void {
    const notification = {...options, hidden: false, createdAt: Date.now()};
    notifications.update((current) => [...current, notification].filter((n) => !n.hidden));
}

export function createNotificationBar(ui: UIContext, parent: Element) {
    const bar = NotificationBar(ui, {
        notifications,
    });
    bar.appendTo(parent);
}
interface NotificationBarProps {
    notifications: ReadableSignal<Notification[]>;
}

const NotificationBar = UIComponent('notification-bar', (ui, props: NotificationBarProps) => {
    const {notifications} = props;
    const css = ui.css;
    return [
        ui.div({class: 'notification-bar'}).children(
            computed(() => {
                const ns = notifications.get();
                return ns.map((notification) => {
                    return NotificationItem(ui, {notification});
                });
            }),
        ),
        css`
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
            .notification-bar > * {
                transition: all ${FADE_OUT_DURATION_MS.toString()}ms ease-in-out;
            }
        `,
    ];
});

interface NotificationItemProps {
    notification: Notification;
}

const NotificationItem = UIComponent('notification-item', (ui, props: NotificationItemProps) => {
    const css = ui.css;
    const {notification} = props;
    const {message, kind, timeoutMs} = notification;
    const aliveMs = Date.now() - notification.createdAt;
    const fading = signal(false);
    const hidden = signal(notification.hidden);
    if (timeoutMs && !notification.hidden) {
        if (aliveMs > timeoutMs && aliveMs < timeoutMs + FADE_OUT_DURATION_MS) {
            fading.set(true);
        } else if (aliveMs >= timeoutMs + FADE_OUT_DURATION_MS) {
            hidden.set(true);
        }
        if (!hidden.get() && !fading.get()) {
            setTimeout(() => {
                fading.set(true);
                const aliveMs = Date.now() - notification.createdAt;
                setTimeout(() => hidden.set(true), timeoutMs + FADE_OUT_DURATION_MS - aliveMs);
            }, timeoutMs - aliveMs);
        } else if (fading.get()) {
            setTimeout(() => hidden.set(true), timeoutMs + FADE_OUT_DURATION_MS - aliveMs);
        }
        effect(() => {
            notification.hidden = hidden.get();
        });
    }

    return [
        ui
            .div({
                class: computed(() => [
                    'notification-item',
                    'notification-item--' + kind,
                    fading.get() ? 'notification-item--fading' : '',
                    hidden.get() ? 'notification-item--hidden' : '',
                ]),
            })
            .children(ui.div({class: 'notification-text'}).children(message)),
        css`
            .notification-item {
                color: white;
                transition: all ${FADE_OUT_DURATION_MS.toString()}ms ease-in-out;
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
            .notification-item--fading {
                opacity: 0;
                transform: translateY(-100%);
            }
            .notification-item--hidden {
                display: none;
            }
        `,
    ];
});
