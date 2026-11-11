import { LEARNING_STEPS, GRADUATION_INTERVAL, EASY_INTERVAL, MIN_EASE_FACTOR, CARD_STATES, ANSWERS } from './constants.js';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const inMinutes = (now, minutes) => new Date(now.getTime() + minutes * MINUTE_MS).toISOString();
const inDays = (now, days) => new Date(now.getTime() + days * DAY_MS).toISOString();

/**
 * Computes the next state of a card after an answer, using a variant of SM-2
 * with learning steps (similar to what popular spaced-repetition apps do).
 * Pure function: returns a new card and never mutates the input.
 *
 * @param {object} card current card
 * @param {string} answer one of ANSWERS
 * @param {Date} [now]
 * @returns {object} updated card
 */
export function scheduleReview(card, answer, now = new Date()) {
    const updated = { ...card };

    if (updated.state === CARD_STATES.NEW || updated.state === 'NEW') {
        updated.state = CARD_STATES.LEARNING;
        updated.learningStepIndex = 0;
        updated.nextReviewDate = inMinutes(now, LEARNING_STEPS[0]);
    } else if (updated.state === CARD_STATES.LEARNING) {
        if (answer === ANSWERS.AGAIN) {
            updated.learningStepIndex = 0;
            updated.nextReviewDate = inMinutes(now, LEARNING_STEPS[0]);
        } else if (answer === ANSWERS.EASY) {
            updated.state = CARD_STATES.REVIEW;
            updated.interval = EASY_INTERVAL;
            updated.repetitions = 1;
            updated.nextReviewDate = inDays(now, EASY_INTERVAL);
        } else {
            const nextStepIndex = (updated.learningStepIndex || 0) + 1;
            if (nextStepIndex < LEARNING_STEPS.length) {
                updated.learningStepIndex = nextStepIndex;
                updated.nextReviewDate = inMinutes(now, LEARNING_STEPS[nextStepIndex]);
            } else {
                updated.state = CARD_STATES.REVIEW;
                updated.interval = GRADUATION_INTERVAL;
                updated.repetitions = 1;
                updated.nextReviewDate = inDays(now, GRADUATION_INTERVAL);
            }
        }
    } else if (updated.state === CARD_STATES.REVIEW) {
        if (answer === ANSWERS.AGAIN) {
            updated.repetitions = 0;
            updated.interval = 1;
            updated.ease_factor = Math.max(MIN_EASE_FACTOR, updated.ease_factor - 0.2);
            updated.state = CARD_STATES.LEARNING;
            updated.learningStepIndex = 0;
            updated.nextReviewDate = inMinutes(now, LEARNING_STEPS[0]);
        } else {
            if (answer === ANSWERS.HARD) {
                updated.ease_factor = Math.max(MIN_EASE_FACTOR, updated.ease_factor - 0.15);
                updated.interval = Math.max(1, updated.interval * 1.2);
            } else if (answer === ANSWERS.GOOD) {
                updated.interval = updated.interval * updated.ease_factor;
            } else if (answer === ANSWERS.EASY) {
                updated.ease_factor = updated.ease_factor + 0.15;
                updated.interval = updated.interval * updated.ease_factor * 1.3;
            }
            updated.interval = Math.round(updated.interval);
            updated.repetitions += 1;
            updated.nextReviewDate = inDays(now, updated.interval);
        }
    }

    return updated;
}
