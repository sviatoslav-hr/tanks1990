import {MinPriorityQueue} from '#/math/priority-queue';
import {describe, expect, it} from 'vitest';

describe('MinPriorityQueue', () => {
    it('should enqueue and dequeue items correctly', () => {
        const queue = new MinPriorityQueue<number>((a, b) => a - b);
        queue.enqueue(5);
        queue.enqueue(3);
        queue.enqueue(8);
        queue.enqueue(1);

        expect(queue.dequeue()).toBe(1);
        queue.enqueue(2);
        expect(queue.dequeue()).toBe(2);
        expect(queue.dequeue()).toBe(3);
        expect(queue.dequeue()).toBe(5);
        expect(queue.dequeue()).toBe(8);
        expect(queue.isEmpty()).toBe(true);
    });

    it('should handle enqueueAll correctly', () => {
        const queue = new MinPriorityQueue<number>((a, b) => a - b);
        queue.enqueueAll(5, 3, 8, 1);

        expect(queue.dequeue()).toBe(1);
        expect(queue.dequeue()).toBe(3);
        expect(queue.dequeue()).toBe(5);
        expect(queue.dequeue()).toBe(8);
    });

    it('should handle empty queue correctly', () => {
        const queue = new MinPriorityQueue<number>((a, b) => a - b);

        expect(queue.dequeue()).toBe(null);
        expect(queue.isEmpty()).toBe(true);
    });

    it('should dequeue items in correct order', () => {
        const queue = new MinPriorityQueue<number>((a, b) => a - b);
        queue.enqueue(7);
        expect(queue.dequeue()).toBe(7);

        queue.enqueueAll(7, 9, 9, 9, 11);
        expect(queue.peek()).toBe(7);
        expect(queue.dequeue()).toBe(7); // 9 9 9

        queue.enqueueAll(9, 9);
        expect(queue.dequeue()).toBe(9); // 9 9 9 9

        queue.enqueue(11);
        expect(queue.dequeue()).toBe(9); // 9 9 9 11

        queue.enqueue(11);
        expect(queue.dequeue()).toBe(9); // 9 9 11 11

        queue.enqueue(11);
        expect(queue.dequeue()).toBe(9); // 9 11 11 11

        queue.enqueueAll(11, 11);
        expect(queue.dequeue()).toBe(9); // 11 11 11 11

        queue.enqueue(11);
        expect(queue.dequeue()).toBe(11); // 11 11 11 11
        expect(queue.isEmpty()).toBe(false);
    });
});
