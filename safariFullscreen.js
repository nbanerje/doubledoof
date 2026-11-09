/**
 * iPhone landscape Safari tab/URL bar hide — port of Playgama’s
 * hide-mobile-safari-tabs (https://github.com/Playgama/hide-mobile-safari-tabs)
 * plus the ISL lock from “I fixed a decade-long iOS Safari problem”.
 *
 * Apple will not let a page hide chrome by itself. Pros:
 *  1) make the document naturally scrollable (tall spacer)
 *  2) keep the game fixed with pointer-events:none so swipes scroll the page
 *  3) when visualViewport says chrome collapsed, lock with ISL so it stays gone
 */
(function safariFullscreen() {
  const MOBILE_CHROME_TOP_BAR_HEIGHT = 20;

  function isIosPhone() {
    return /iPhone|iPod/i.test(navigator.userAgent || "");
  }

  function isStandalone() {
    return (
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      (typeof window.DOUBLEDOOF_SERVER === "string" && window.DOUBLEDOOF_SERVER.length > 0) ||
      (typeof window.BATDUEL_SERVER === "string" && window.BATDUEL_SERVER.length > 0)
    );
  }

  function isLandscape() {
    if (window.matchMedia("(orientation: landscape)").matches) return true;
    if (typeof window.orientation === "number" && Math.abs(window.orientation) === 90) return true;
    const type = window.screen?.orientation?.type || "";
    return String(type).startsWith("landscape");
  }

  function arcadeBlockingChromeHide() {
    // Lobby / setup / code entry must stay tappable — chrome-hide steals the page.
    const arcade = document.getElementById("arcadeOverlay");
    if (arcade && !arcade.classList.contains("hidden")) return true;
    const buff = document.getElementById("buffPickOverlay");
    if (buff && !buff.classList.contains("hidden")) return true;
    return false;
  }

  function shouldRun() {
    return isIosPhone() && !isStandalone() && isLandscape() && !arcadeBlockingChromeHide();
  }

  function tabsAreOpen() {
    const viewport = window.visualViewport;
    if (!viewport) return false;
    const screenShort = Math.min(window.screen.width || 0, window.screen.height || 0);
    if (!screenShort) return false;
    return viewport.height + (viewport.offsetTop || 0) < screenShort - MOBILE_CHROME_TOP_BAR_HEIGHT;
  }

  const root = document.documentElement;
  const app = () => document.querySelector(".app");
  const holder = () => document.getElementById("safariIslHolder");
  const content = () => document.getElementById("safariIslContent");
  const spacer = () => document.getElementById("safariNudge");
  const overlay = () => document.getElementById("safariChromeHint");

  let tabsOpen = null;
  let rafId = 0;
  let applyTimer = 0;
  let active = false;

  function setIslVh() {
    root.style.setProperty("--isl-vh", `${window.innerHeight * 0.01}px`);
  }

  function placeAppOpen() {
    const el = app();
    const sp = spacer();
    if (!el) return;
    // Game sits fixed over the viewport; pointer-events none so the swipe
    // reaches the document and Safari can collapse its chrome (Playgama pattern).
    if (sp && sp.parentNode) {
      document.body.insertBefore(el, sp);
    } else {
      document.body.appendChild(el);
    }
    el.classList.add("safari-game-fixed");
    el.classList.remove("safari-game-locked");
    el.style.pointerEvents = "none";
  }

  function placeAppLocked() {
    const el = app();
    const slot = content();
    if (!el || !slot) return;
    slot.appendChild(el);
    el.classList.remove("safari-game-fixed");
    el.classList.add("safari-game-locked");
    el.style.pointerEvents = "";
  }

  function applyOpen(open) {
    const sp = spacer();
    const tip = overlay();
    root.classList.toggle("safari-isl-active", true);
    root.classList.toggle("safari-is-locked", !open);
    if (sp) sp.classList.toggle("is-visible", open);
    if (tip) tip.hidden = !open;
    if (open) placeAppOpen();
    else placeAppLocked();
    setIslVh();
  }

  function deactivate() {
    if (applyTimer) {
      window.clearTimeout(applyTimer);
      applyTimer = 0;
    }
    const el = app();
    const sp = spacer();
    const tip = overlay();
    const hold = holder();
    root.classList.remove("safari-isl-active", "safari-is-locked");
    if (sp) sp.classList.remove("is-visible");
    if (tip) tip.hidden = true;
    if (el) {
      el.classList.remove("safari-game-fixed", "safari-game-locked");
      el.style.pointerEvents = "";
      // Restore app before scripts / after holder.
      if (hold && hold.parentNode) document.body.insertBefore(el, hold);
      else document.body.insertBefore(el, document.body.firstChild);
    }
    root.style.removeProperty("--isl-vh");
    tabsOpen = null;
    active = false;
  }

  function measure() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!shouldRun()) {
        if (active) deactivate();
        return;
      }
      active = true;
      setIslVh();
      const open = tabsAreOpen();
      if (open === tabsOpen) return;
      tabsOpen = open;
      if (applyTimer) window.clearTimeout(applyTimer);
      // Playgama: apply immediately when opening chrome UI; delay 100ms when locking
      // so Safari finishes collapsing before we freeze the layout.
      applyTimer = window.setTimeout(() => {
        applyTimer = 0;
        if (!shouldRun()) {
          deactivate();
          return;
        }
        applyOpen(tabsAreOpen());
      }, open ? 0 : 100);
    });
  }

  function scrollChromeAway() {
    // User-gesture scroll so Safari will collapse its bars (programmatic alone is ignored).
    const y = Math.max(120, Math.floor(window.innerHeight * 0.35));
    try {
      window.scrollTo({ top: y, left: 0, behavior: "smooth" });
    } catch (_) {
      window.scrollTo(0, y);
    }
    window.setTimeout(measure, 120);
    window.setTimeout(measure, 400);
  }

  function init() {
    if (!isIosPhone()) return;
    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("orientationchange", () => {
      tabsOpen = null;
      measure();
    }, { passive: true });
    window.addEventListener("pageshow", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) measure();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", measure, { passive: true });
      window.visualViewport.addEventListener("scroll", measure, { passive: true });
    }
    if (window.screen?.orientation?.addEventListener) {
      window.screen.orientation.addEventListener("change", () => {
        tabsOpen = null;
        measure();
      });
    }
    const tip = overlay();
    if (tip) {
      // Keep the full-screen shell pass-through; only the pill catches taps.
      tip.style.pointerEvents = "";
      const pill = tip.querySelector("p");
      const tapTarget = pill || tip;
      tapTarget.addEventListener(
        "pointerdown",
        (ev) => {
          if (tip.hidden) return;
          ev.preventDefault();
          ev.stopPropagation();
          scrollChromeAway();
        },
        { passive: false }
      );
    }
    // When setup/lobby opens or closes, re-evaluate so code entry isn't blocked.
    const arcade = document.getElementById("arcadeOverlay");
    if (arcade && typeof MutationObserver === "function") {
      new MutationObserver(() => {
        tabsOpen = null;
        measure();
      }).observe(arcade, { attributes: true, attributeFilter: ["class"] });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
