"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Where the nav's text starts on desktop: the header's links have 4px top
 * padding (SiteHeaderDesktop), the same 4px headerRowLayout gives content
 * pages so their first line sits level with the nav.
 */
const NAV_TEXT_TOP = 4;

/** Tailwind's lg breakpoint, where the nav and content share a row. */
const DESKTOP = "(min-width: 1024px)";

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** How many rows back the list starts before stepping into place. */
const STEPS_BACK = 10;
/** Each step: a quick move of one row, then a pause on it. */
const STEP_MOVE_MS = 15;
const STEP_HOLD_MS = 11;
/** A pause on the starting row, so the first step reads as a step. */
const START_HOLD_MS = 19;
const STEP_EASING = "cubic-bezier(0.3, 0, 0.2, 1)";

/**
 * Starts the list `target` belongs to up to STEPS_BACK rows further back, then
 * ticks it forward a row at a time until `target` is back where the page was
 * scrolled to put it. Moves the list (a transform), not the page's scroll, so
 * the visitor can scroll freely throughout; and leaves no transform behind.
 */
const stepIntoPlace = (target: HTMLElement) => {
  const list = target.parentElement;

  if (!list) {
    return;
  }

  // The rows before the target, nearest first: each step lands on one, in
  // reverse, so rows of any height line up exactly.
  const rows: Array<Element> = [];
  for (
    let row = target.previousElementSibling;
    row && rows.length < STEPS_BACK;
    row = row.previousElementSibling
  ) {
    rows.push(row);
  }

  if (!rows.length) {
    return;
  }

  const targetTop = target.getBoundingClientRect().top;
  // Translations from furthest back to in place (0).
  const positions = [
    ...rows.map((row) => targetTop - row.getBoundingClientRect().top).reverse(),
    0,
  ];

  // Every step's move, and a hold before each but the first: there's none
  // after the last, as arriving in place is the end.
  const steps = positions.length - 1;
  const duration =
    START_HOLD_MS + steps * STEP_MOVE_MS + (steps - 1) * STEP_HOLD_MS;
  const keyframes: Array<Keyframe> = [];
  let time = 0;

  positions.forEach((y, index) => {
    const transform = `translateY(${y}px)`;

    // Arrive on this row, then hold on it until the next step starts.
    keyframes.push({ transform, offset: time / duration, easing: "linear" });
    if (index < steps) {
      time += index === 0 ? START_HOLD_MS : STEP_HOLD_MS;
      keyframes.push({
        transform,
        offset: time / duration,
        easing: STEP_EASING,
      });
      time += STEP_MOVE_MS;
    }
  });

  list.animate(keyframes, { duration });
};

/**
 * Starts the home page scrolled so the event row `targetId` sits level with
 * the nav, leaving the past events before it a scroll up away rather than out
 * of reach, with the list ticking the last few rows into place
 * (stepIntoPlace) unless the visitor prefers reduced motion. Desktop only.
 * Left alone when the visitor has already scrolled,
 * or arrived with a #fragment or a restored scroll position, so it never
 * takes the page from under them.
 *
 * Renders a spacer at the end of the list: when the page is too short to
 * scroll that far, it's grown by just the shortfall so the alignment holds.
 */
export const ScrollToEvent = ({ targetId }: { targetId: string }) => {
  const spacer = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const target = document.getElementById(targetId);

    if (
      !target ||
      !spacer.current ||
      window.location.hash ||
      window.scrollY > 0 ||
      !window.matchMedia(DESKTOP).matches
    ) {
      return;
    }

    const top =
      target.getBoundingClientRect().top + window.scrollY - NAV_TEXT_TOP;
    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;

    if (top > scrollable) {
      spacer.current.style.height = `${top - scrollable}px`;
    }

    window.scrollTo({ top, behavior: "instant" });

    if (window.matchMedia(MOTION_OK).matches) {
      stepIntoPlace(target);
    }
  }, [targetId]);

  return <div ref={spacer} aria-hidden />;
};
