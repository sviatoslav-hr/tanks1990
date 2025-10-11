import {computed, ReadableSignal, signal} from '#/signals';
import {mountWComponent, wComponent, WContext} from '#/ui/w';

const notifications = signal<Notification[]>([]);
const FADE_OUT_DURATION_MS = 500;

export function createNotificationBar(w: WContext, parent: HTMLElement): void {
    const bar = NotificationBar({
        notifications,
        fadeOutDurationMs: FADE_OUT_DURATION_MS,
    });
    mountWComponent(w, bar, parent);
}

interface NotifyOptions {
    timeoutMs?: number;
}

// TODO: Provide a way to pass an AbortController to the notification
export function notify(message: string, options?: NotifyOptions): void {
    message = normalizeMessage(message);
    const timeoutMs = options?.timeoutMs ?? 2000;
    appendNotification({message, kind: 'info', visibleTimeMs: timeoutMs});
}

export function notifyWarning(message: string, options?: NotifyOptions): void {
    message = normalizeMessage(message);
    const timeoutMs = options?.timeoutMs ?? 3000;
    appendNotification({message, kind: 'warning', visibleTimeMs: timeoutMs});
}

// TODO: When there is too many spamming errors, we should stop showing them individually
// and instead show a single error message with a count of how many errors happened
export function notifyError(message: string, options?: NotifyOptions): void {
    message = normalizeMessage(message);
    const timeoutMs = options?.timeoutMs ?? 5000;
    appendNotification({message, kind: 'error', visibleTimeMs: timeoutMs});
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
    visibleTimeMs?: number;
}

interface Notification extends NotificationOptions {
    fading: boolean;
    createdAt: number;
}

function appendNotification(options: NotificationOptions): void {
    let notification: Notification = {
        ...options,
        fading: false,
        createdAt: Date.now(),
    };
    notifications.update((ns) => [...ns, notification]);
    if (notification.visibleTimeMs) {
        setTimeout(() => fadeNotification(notification), notification.visibleTimeMs);
    }
}

function fadeNotification(notification: Notification): void {
    const newNotification = {...notification, fading: true};
    notifications.update((ns) => ns.map((n) => (n === notification ? newNotification : n)));
    notification = newNotification;
    setTimeout(() => removeNotification(notification), FADE_OUT_DURATION_MS);
}

function removeNotification(notification: Notification): void {
    notifications.update((ns) => ns.filter((n) => n !== notification));
}

interface NotificationBarProps {
    notifications: ReadableSignal<Notification[]>;
    fadeOutDurationMs: number;
}

const NotificationBar = wComponent<NotificationBarProps>((w, props) => {
    const {notifications, fadeOutDurationMs} = props;
    return [
        w.div(
            {
                class: 'notification-bar',
                style: {['--notification-fade-out-duration']: fadeOutDurationMs + 'ms'},
                title: () => notifications().length + ' notifications',
            },
            w.div({class: 'notification-bar__spacer'}),
            w.each(
                () => notifications(),
                (n, i) => NotificationItem({notification: n, index: i}),
            ),
        ),
    ];
});

interface NotificationItemProps {
    notification: Notification;
    index?: number;
}

const NotificationItem = wComponent((w, props: NotificationItemProps) => {
    const {notification, index} = props;
    const {message, kind} = notification;
    return w.div(
        {
            title: index != null ? `#${index + 1}` : undefined,
            class: computed(() => [
                'notification-item',
                'notification-item--' + kind,
                {
                    'notification-item--fading': notification.fading,
                },
            ]),
        },
        w.div({class: 'notification-text'}, message),
    );
});
