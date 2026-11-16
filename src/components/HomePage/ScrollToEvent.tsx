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

/**
 * How far from the top of the viewport the target row should sit. On desktop,
 * level with the nav's text. Below that the header is a sticky bar over the
 * content, so the row goes just beneath whichever header is showing.
 */
const targetOffset = () => {
  if (window.matchMedia(DESKTOP).matches) {
    return NAV_TEXT_TOP;
  }

  const header = Array.from(document.querySelectorAll("header")).find(
    (element) => element.getClientRects().length > 0,
  );

  return header ? header.getBoundingClientRect().bottom : 0;
};

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

/** How many frames to wait for a hidden list to be laid out before giving up. */
const MAX_WAIT_FRAMES = 30;

/**
 * Resets the home page's scroll position on every visit, reloads and
 * back/forward included. It starts scrolled so the event row `targetId` sits
 * level with the nav (on smaller screens, just below the sticky header; see
 * targetOffset), leaving the past events before it a scroll up away rather
 * than out of reach, with the list ticking the last few rows into place
 * (stepIntoPlace) unless the visitor prefers reduced motion. With no target
 * (too few past events to scroll past), it starts at the top.
 *
 * The browser's own scroll restoration is switched off while the home page is
 * up, so it can't put a remembered position back over this one. Only a
 * #fragment is left alone, so a link into the page still lands where it
 * points.
 *
 * Renders a spacer at the end of the list: when the page is too short to
 * scroll that far, it's grown by just the shortfall so the alignment holds.
 *
 * With `cacheComponents` on, Next keeps a page the visitor has left mounted
 * but hidden, and shows that same instance again on the way back. So this
 * runs again on every reveal, not only on mount, and has to allow for two
 * things: the spacer still holds its last height, and the list may not be
 * laid out yet when the effect runs (a hidden element measures at 0, which
 * would scroll by wherever the previous page was). Hence the spacer is reset
 * before each measurement, and placement waits for the list to be visible.
 */
export const ScrollToEvent = ({ targetId }: { targetId?: string }) => {
  const spacer = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const { history } = window;
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    let frame: number | undefined;

    const cleanUp = () => {
      history.scrollRestoration = restoration;
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };

    if (window.location.hash) {
      return cleanUp;
    }

    const target = targetId ? document.getElementById(targetId) : null;

    /**
     * Where to scroll, measured once: the list animates with a transform as
     * soon as it's placed, and measuring again mid-animation would land low.
     */
    let measured: number | undefined;

    /** Scrolls into place; false when the list isn't laid out to measure. */
    const place = () => {
      if (!target || !spacer.current) {
        window.scrollTo({ top: 0, behavior: "instant" });
        return true;
      }

      if (measured !== undefined) {
        window.scrollTo({ top: measured, behavior: "instant" });
        return true;
      }

      if (!target.getClientRects().length) {
        return false;
      }

      // A step animation still running from an earlier pass (React runs
      // effects twice in development; a cached page reveals more than once)
      // shifts the list with a transform, and would throw the measurement off.
      for (const animation of target.parentElement?.getAnimations() ?? []) {
        animation.cancel();
      }

      // Measured without the last visit's spacer, from the top of the
      // document, whatever the page is scrolled to.
      spacer.current.style.height = "";
      const top =
        target.getBoundingClientRect().top + window.scrollY - targetOffset();
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;

      if (top > scrollable) {
        spacer.current.style.height = `${top - scrollable}px`;
      }

      measured = top;
      window.scrollTo({ top, behavior: "instant" });
      return true;
    };

    let animated = false;
    const animate = () => {
      if (!animated && target && window.matchMedia(MOTION_OK).matches) {
        animated = true;
        stepIntoPlace(target);
      }
    };

    // Placed now if the list is laid out, so a first load never paints at the
    // wrong position. Then again on the next frame, before it paints: on a
    // navigation within the site, Next's router scrolls the page to the top
    // after this effect has run (its ScrollAndFocusHandler mounts after the
    // page it wraps). A list still hidden here is placed on the first frame it
    // can be measured.
    if (place()) {
      animate();
    }

    let waited = 0;
    const onFrame = () => {
      frame = undefined;
      if (place()) {
        animate();
      } else if (++waited < MAX_WAIT_FRAMES) {
        frame = requestAnimationFrame(onFrame);
      }
    };
    frame = requestAnimationFrame(onFrame);

    return cleanUp;
  }, [targetId]);

  return <div ref={spacer} aria-hidden />;
};
