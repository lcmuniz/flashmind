import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleReview } from '../src/lib/scheduler.js';
import { CARD_STATES, ANSWERS, LEARNING_STEPS, EASY_INTERVAL, MIN_EASE_FACTOR } from '../src/lib/constants.js';

const NOW = new Date('2026-01-01T12:00:00.000Z');
const minutesFromNow = (m) => new Date(NOW.getTime() + m * 60000).toISOString();
const daysFromNow = (d) => new Date(NOW.getTime() + d * 86400000).toISOString();

const newCard = () => ({ id: 1, state: CARD_STATES.NEW, interval: 0, ease_factor: 2.5, repetitions: 0, learningStepIndex: 0 });
const reviewCard = (overrides = {}) => ({ id: 1, state: CARD_STATES.REVIEW, interval: 10, ease_factor: 2.5, repetitions: 3, learningStepIndex: 0, ...overrides });

describe('scheduleReview', () => {
    it('moves a new card into the first learning step', () => {
        const card = scheduleReview(newCard(), ANSWERS.GOOD, NOW);
        assert.equal(card.state, CARD_STATES.LEARNING);
        assert.equal(card.nextReviewDate, minutesFromNow(LEARNING_STEPS[0]));
    });

    it('advances through learning steps and graduates', () => {
        let card = scheduleReview(newCard(), ANSWERS.GOOD, NOW);
        card = scheduleReview(card, ANSWERS.GOOD, NOW);
        assert.equal(card.learningStepIndex, 1);
        assert.equal(card.nextReviewDate, minutesFromNow(LEARNING_STEPS[1]));
        card = scheduleReview(card, ANSWERS.GOOD, NOW);
        assert.equal(card.state, CARD_STATES.REVIEW);
        assert.equal(card.repetitions, 1);
        assert.equal(card.nextReviewDate, daysFromNow(1));
    });

    it('graduates immediately on EASY while learning', () => {
        const learning = scheduleReview(newCard(), ANSWERS.GOOD, NOW);
        const card = scheduleReview(learning, ANSWERS.EASY, NOW);
        assert.equal(card.state, CARD_STATES.REVIEW);
        assert.equal(card.interval, EASY_INTERVAL);
    });

    it('multiplies the interval by the ease factor on GOOD', () => {
        const card = scheduleReview(reviewCard(), ANSWERS.GOOD, NOW);
        assert.equal(card.interval, 25);
        assert.equal(card.repetitions, 4);
        assert.equal(card.nextReviewDate, daysFromNow(25));
    });

    it('lowers ease on HARD and raises it on EASY', () => {
        assert.equal(scheduleReview(reviewCard(), ANSWERS.HARD, NOW).ease_factor, 2.35);
        assert.equal(scheduleReview(reviewCard(), ANSWERS.EASY, NOW).ease_factor, 2.65);
    });

    it('sends a lapsed card back to learning without dropping ease below the minimum', () => {
        const card = scheduleReview(reviewCard({ ease_factor: 1.4 }), ANSWERS.AGAIN, NOW);
        assert.equal(card.state, CARD_STATES.LEARNING);
        assert.equal(card.repetitions, 0);
        assert.equal(card.ease_factor, MIN_EASE_FACTOR);
    });

    it('does not mutate the input card', () => {
        const original = reviewCard();
        const snapshot = { ...original };
        scheduleReview(original, ANSWERS.EASY, NOW);
        assert.deepEqual(original, snapshot);
    });
});
