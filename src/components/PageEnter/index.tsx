"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

import { usePathname } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Matches the animate-slide-up keyframes in tailwind.config.ts. */
const KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: "translateY(1.5rem)" },
  { opacity: 1, transform: "translateY(0)" },
];
const TIMING: KeyframeAnimationOptions = {
  duration: 400,
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
};

/** Tailwind's `motion-safe`: only for visitors who haven't asked for less motion. */
const ANIMATE_QUERY = "(prefers-reduced-motion: no-preference)";

const isAnimated = (pathname: string) => pathname !== "/";

/**
 * Slides a page's content up into place as it loads, on every page but the
 * home page.
 *
 * The first page is animated in CSS, so it plays from first paint rather than
 * after hydration. Later client-side navigations don't remount this wrapper,
 * so they replay the same motion with the Web Animations API instead. Neither
 * leaves a transform behind once finished, so sticky and fixed descendants
 * behave as they would without it.
 */
export const PageEnter = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  // Fixed at the first page: changing the class later would start the CSS
  // animation on top of the scripted one.
  const [initialPathname] = useState(pathname);
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isAnimated(pathname) && window.matchMedia(ANIMATE_QUERY).matches) {
      ref.current?.animate(KEYFRAMES, TIMING);
    }
  }, [pathname]);

  return (
    <div
      ref={ref}
      className={cn(
        isAnimated(initialPathname) && "motion-safe:animate-slide-up",
      )}
    >
      {children}
    </div>
  );
};
