# Scroll lag on high-resolution (4K) screens: how to test and fix it

This guide was written after we found and fixed scroll lag in the sibling project
`requisitions_automation` (Hotpoint Apps Hub). This project uses the same visual
style (Tailwind "frosted glass" cards, embedded in the same portal), so it probably
has the same problem. Use this guide to check for it and fix it.

## Symptom

- The app feels smooth on a 1080p screen but lags on a 4K screen, especially when
  scrolling long pages, forms, tables and slide-in panels.
- Shrinking the browser window makes the lag go away. A narrow window uses
  DevTools device emulation, such as "Surface Pro", which does this too.
- Other heavy sites (for example a long GitHub page) scroll smoothly on the same
  screen, so the monitor and cable are not the cause.

## Root cause (as measured in requisitions_automation)

The lag comes from the GPU running out of time to draw pixels, not from JavaScript.

- The test machine had an **Intel UHD integrated GPU**. Its 4K screen ran at
  **250% Windows scaling**, which gives a 1536x864 CSS viewport at devicePixelRatio 2.5.
  The page layout is therefore identical to 1080p, but every frame has about
  **8.3 million pixels** to draw, 4x as many.
- While scrolling, the main thread was almost idle: about 0 ms of script and a few
  ms of style/layout per frame. Frames were slow because they waited on the GPU.
- Three things were responsible for nearly all of the cost:
  1. **`backdrop-filter: blur()`** (Tailwind `backdrop-blur-*`) on large or scrolling
     surfaces. The blur is recomputed for every frame over every pixel under the
     element. At `backdrop-blur-2xl` (40px), a few large blurred cards will saturate
     an integrated GPU at 4K. In most places it had **no visible effect**, because
     the element sat on a plain white background.
  2. **A transparent scroll container.** A scroller with no background of its own
     (the content panel of a slide-in modal, for example) is much more expensive to
     scroll. Adding `bg-white` to the scrolling element fixed it.
  3. **A `position: fixed` full-screen layer inside the scroll container**, such as
     a decorative background of blurred blobs, a grid or a watermark placed under the
     content. The browser has to recomposite that full-screen layer beneath the
     scrolling content on every frame. **What is drawn in it doesn't matter**:
     swapping the 100–130px blurred blobs for plain `radial-gradient`s changed
     nothing. Changing the layer from `fixed` to `absolute` (it then scrolls away
     with the top of the page) was as fast as deleting it.
- These made no measurable difference **in requisitions_automation**: large
  `box-shadow`s (small gain, only once the blur was gone), `border-radius`,
  `mask-image`, transitions and animations, and `animate-pulse`. **This does not
  carry over.** In issue-desk-embedded, `border-radius` on a scroll container and
  infinite animations were the main causes (see the next section). Always run the
  benchmark instead of assuming.
- We also found an unrelated bug: the same form modals were rendered by two
  components (desktop sidebar and mobile header), so every form was mounted twice.
  Check whether this project mounts anything twice as well.

### Numbers (frames per second while scrolling; 60 = perfect)

| Page                                                   | Before | After            | What fixed it                                                                                        |
| ------------------------------------------------------ | ------ | ---------------- | ---------------------------------------------------------------------------------------------------- |
| Dashboard with tables                                  | 18.5   | 56–59            | Removed blur from table containers and inputs; sticky jump-nav changed to `bg-white/95` with no blur |
| Slide-in form panel (Travel)                           | 12     | 52–53            | Removed blur from the form cards **and** gave the panel's scroller `bg-white`                        |
| Public homepage                                        | 39     | 46–49            | Ambient background layer changed from `fixed` to `absolute`                                          |
| Guidelines page                                        | 58     | 60               | Same shared page shell as the homepage (it was already close)                                        |
| Details modal, PDF view, HR salary advance, `/advance` | 56–60  | no change needed | –                                                                                                    |
| Login page                                             | –      | –                | Fits on one screen at 4K and doesn't scroll, so nothing to fix                                       |

For the form panel, neither change alone was enough: removing the blur gave 30 fps
and the opaque scroller alone gave 21 fps. Both together gave 52–60 fps.

About 50–60 fps was the practical ceiling for a full-screen scroll on this GPU at
4K. Once a page reached that, removing more effects didn't help.

## Root cause (as measured in issue-desk-embedded)

Same machine: Intel UHD, 250% scaling, a 1536x729 viewport at DPR 2.5 (about 7M
device pixels). This app has almost no `backdrop-blur`, and its main scroller already
had `bg-white`, but it still scrolled at 27 fps. The causes were different:

1. **`border-radius` on a scroll container.** The dashboard's `#main-content`
   (a `fixed` scroller with `rounded-2xl`) needs a rounded clip mask that Chrome
   recomposites on every scroll frame. Squaring only that element took the
   dashboard from 27 to 53 fps. Faking the corners with a full-screen overlay
   (`box-shadow` spread) did **not** help, because that is another full-screen layer.
   Four 16px corner "ears" did help: small absolutely positioned elements with a
   `radial-gradient` that is transparent inside the arc, the border colour on the
   arc, and the page colour outside it. They look identical and cost nothing.
2. **A rounded nested scroller inside it.** The issues table was wrapped in
   `overflow-x-auto rounded-xl`, about 1800 CSS px tall. Its rounded clip mask is
   around 14M device pixels and moves on every page-scroll frame. The fix was to make
   the rounded card non-clipping and put the `overflow-x-auto` on an inner div
   **with an opaque background**, inside the card's padding, so it never reaches
   the rounded corners. Making that inner scroller transparent made it _slower_
   than before (24 fps), because it hit cause 2 of the previous section.
3. **The page behind an open modal still counts.** With the Admin panel open, the
   rounded page scroller underneath (dimmed, not scrolling) cost 44 → 59 fps while
   the modal body scrolled. The modal numbers were: 12 fps baseline, 34 with the
   full-screen `backdrop-filter: blur(8px)` backdrop removed, 42 with the page shell
   squared as well, 56 with an opaque modal body, and 60 with the card's
   `overflow-hidden` also removed. The card's clip can stay.
4. **Infinite animations.** The costly ones were an endless transform animation on a
   `blur-[110px]` hero glow, an `animate-pulse` icon on every table row, and about 66
   decorative skeleton bars pulsing through **inline `style={{ animation }}`**.
   A class-based search such as `.animate-pulse` misses these. Use
   `document.getAnimations()` to list what is really running. Entrance animations
   with `animation-fill-mode: forwards` also keep elements as GPU layers after
   they finish. If the end state equals the element's natural style, use
   `backwards` instead.
5. **A blurred sticky nav over long pages** (`backdrop-filter: blur(8px)` once
   scrolled). This matches the previous section: manual 37 → 57 fps, changelog
   47 → 59 fps with a near-opaque background instead.

| Page                     | Before | After |
| ------------------------ | ------ | ----- |
| Dashboard (issues table) | 27     | 58–60 |
| Analytics                | 28     | 56    |
| Super Admin              | 31     | 54–55 |
| Article (in dashboard)   | 31     | 53–59 |
| Admin panel modal        | 12     | 60    |
| Homepage                 | 34–41  | 54–58 |
| Manual                   | 37–40  | 57    |

## Root cause (as measured in staffproductpurchase-embedded)

Same machine again: Intel UHD, 250% scaling, a 1536x673 viewport at DPR 2.5
(about 6.5M device pixels). Measured in both light and dark themes, signed in as cc.

1. **A nested scroller inside a rounded scroller.** The dashboard `<main>`
   (`ReusableLayoutShell.jsx`) is a `fixed` scroller with `rounded-t-2xl
custom:rounded-b-2xl`, and the tables sit in an `overflow-x-auto rounded-xl`
   wrapper (`DataTable.jsx`, `ProductItemsInfo.jsx`). **The rounded scroller on its
   own was free**: New Purchase and the edit page scroll at 60 fps with it, because
   they contain no overflowing nested scroller. What costs is the combination. A
   nested scroller is composited, so Chrome needs a rounded clip _mask layer_ for
   it on every frame. On Home, making the table wrapper `overflow: visible` gave
   60 fps with the rounded shell left alone; squaring only the shell gave 51–54.
   The table wrapper itself can stay `rounded-xl` once the shell is square.
   Fix: the scroller is square, and four 16px `.shell-ear` corner overlays in
   `styles/globals.css` provide the rounded look, sitting in a non-scrolling
   `fixed` wrapper next to `<main>`.
2. **A blurred sticky filter panel** (`FilterPanel.jsx`, `bg-white/95
backdrop-blur`). In light mode, squaring both scrollers gave about 44–50 fps;
   also removing this blur gave 60. Its background was already 95% opaque, so
   the blur had no visible effect.
3. **`mix-blend-multiply` on the landing Hero's blurred blobs.** This was the main
   homepage cost (33–40 → 49 fps on its own). On white, multiply looks the same as
   normal blending, so it was dropped. In dark mode, multiply over near-black made
   the blobs invisible anyway, so they are now `dark:hidden`. The two small
   `backdrop-blur-sm` elements (Hero stat pills, CTA icon) were removed as well.
   The blurred landing header was changed to an opaque background.
4. **Things that didn't matter here:** `box-shadow`, transitions and animations,
   `filter: blur` on the decorative blobs, the `animate-ping` badge once the blend
   mode was gone, giving the scroller an opaque background (it already had one),
   and the blurred header on the changelog and manual pages (60 fps either way).
   There are no full-screen `fixed` decorative layers, and nothing heavy is
   mounted twice (`UserMenu` renders in the sidebar and the hidden mobile header,
   but `SettingsPage` only mounts on click).
5. **Not scroll-tested:** the Settings modal body doesn't overflow at this size,
   so it never scrolls. The ChangeLog modal (a transparent scroller inside an
   `overflow-hidden rounded-xl` card) only opens on a version alert. If either
   one starts scrolling, benchmark it with the modal open.

| Page (light theme unless noted)       | Before | After |
| ------------------------------------- | ------ | ----- |
| Dashboard home (approver table)       | 29–33  | 60    |
| Dashboard home, dark theme            | 30–33  | 57–58 |
| Fully Approved (payment tracking, cc) | 26–30  | 58–60 |
| Purchase view (`/dashboard/[id]`)     | 31     | 60    |
| Purchase edit, New Purchase           | 60     | 60    |
| Landing page                          | 33–40  | 56–58 |
| Changelog, User manual                | 60     | 60    |

**Gotcha:** don't run `npm run build` while `next dev` is running from the same
checkout. Both use `.next`, and the build overwrites the dev server's output, so
every page returns "Internal Server Error" until `next dev` is restarted
(`NEXT_DIST_DIR` doesn't help; only a `distDir` in `next.config.mjs` would).

## How to test

### 0. Set up the test

- Put the browser window **full-screen on the high-resolution screen** and keep it
  in front. Chrome pauses or throttles rendering for tabs that are hidden or covered
  by other windows (`document.visibilityState === "hidden"`), and a benchmark run
  there gives meaningless numbers or never finishes.
- Don't rely on DevTools device emulation. It renders a much smaller viewport, can
  switch to a different (mobile) layout, and turns off hover when touch is emulated,
  so it hides the problem.
- A dev server is fine for this. The cost is GPU drawing, which is the same in a
  production build.
- If you use the Claude in Chrome extension, it draws a full-screen animated glow
  overlay while it works. That adds GPU load, so hide it during measurements. The
  snippet below does this. The extension can re-inject the overlay (for example
  after the page is rewritten), so it is safest to hide it on an interval:
  `setInterval(() => [...document.querySelectorAll('body > div')].filter(e => getComputedStyle(e).zIndex === '2147483646').forEach(e => e.style.setProperty('display', 'none', 'important')), 500)`.
- **Discard the first run after a page load.** Data is still loading then, and one
  run read 17.8 fps where the following runs read 56–59.
- **Turn off smooth scrolling on the scroller** (`scroll-behavior: auto !important`)
  when a page uses `scroll-smooth` or `html { scroll-behavior: smooth }`. Otherwise
  every `scrollTop` write in the benchmark starts an animated scroll, and the
  numbers drift from run to run.
- Put a `baseline` row at both the start and the end of the variant list. If the
  two differ by more than a few fps, the page was still settling (entrance
  animations, data loading), so rerun it.
- **Pages that redirect signed-in users** (a public homepage or login page, for
  example) can still be tested without signing out. Fetch their signed-out HTML
  without cookies and render it as static markup in a tab on the same origin:

  ```js
  const html = await (
    await fetch("/login", { credentials: "omit", redirect: "manual" })
  ).text();
  document.open();
  document.write(html.replace(/<script\b[\s\S]*?<\/script>/gi, ""));
  document.close();
  ```

  Scripts are stripped, so nothing hydrates, but the CSS and layout render exactly
  as they do for real, which is all a scroll benchmark needs.

- A page that fits on one screen doesn't scroll, so it can't lag while scrolling.
  Check the scroller's `scrollHeight` against its `clientHeight` before reading
  anything into a 60 fps result.

### 1. Check the environment (Console)

```js
const gl = document.createElement("canvas").getContext("webgl");
const ext = gl.getExtension("WEBGL_debug_renderer_info");
({
  viewport: [innerWidth, innerHeight],
  dpr: devicePixelRatio,
  devicePixels: Math.round(innerWidth * innerHeight * devicePixelRatio ** 2),
  gpu: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
  visible: document.visibilityState,
});
```

About 8 million `devicePixels` on an integrated GPU is the risky combination.

### 2. List what is blurred (Console)

```js
[...document.querySelectorAll("*")]
  .filter((e) => getComputedStyle(e).backdropFilter !== "none")
  .map((e) => {
    const r = e.getBoundingClientRect();
    return {
      blur: getComputedStyle(e).backdropFilter,
      area: Math.round(r.width * r.height),
      cls: e.className.toString().slice(0, 80),
    };
  })
  .sort((a, b) => b.area - a.area);
```

Large areas at `blur(24px)` or `blur(40px)` are the prime suspects. Elements at
`opacity: 0` (for example a closed mobile-menu backdrop) cost nothing.

### 3. Benchmark with each suspect turned off (Console)

Paste this on the laggy page, with a modal open if a modal is what lags, and don't
touch the mouse or keyboard for about 25 seconds. It scrolls the largest scrollable
element on the page up and down under each set of CSS overrides and prints a table.

```js
(async () => {
  const hideExt = document.createElement("style");
  hideExt.textContent =
    'body > div[style*="2147483646"]{display:none!important}';
  document.head.appendChild(hideExt);
  const scroller =
    [...document.querySelectorAll("*")]
      .filter(
        (e) =>
          e.scrollHeight > e.clientHeight + 100 &&
          /auto|scroll/.test(getComputedStyle(e).overflowY),
      )
      .sort(
        (a, b) =>
          b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight,
      )[0] || document.scrollingElement;
  scroller.dataset.benchScroller = "1";
  // Rounded elements inside the scroller that also clip (nested scrollers, overflow-hidden cards)
  scroller.querySelectorAll("*").forEach((e) => {
    const s = getComputedStyle(e);
    if (s.borderRadius !== "0px" && s.overflow !== "visible")
      e.dataset.benchNestedClip = "1";
  });
  const NOBLUR =
    "*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}";
  const OPAQUE = "[data-bench-scroller]{background:#fff!important}";
  const variants = {
    baseline: "",
    // Stops scrollTop writes from animating on pages that use smooth scrolling
    noSmooth: "[data-bench-scroller],html{scroll-behavior:auto!important}",
    noBlur: NOBLUR,
    opaqueScroller: OPAQUE,
    noBlurOpaqueScroller: NOBLUR + OPAQUE,
    noShadow: "*{box-shadow:none!important}",
    noTransAnim: "*{transition:none!important;animation:none!important}",
    noRadius: "*{border-radius:0!important}",
    // The scroller's own rounded corners (issue-desk-embedded: 27 → 53 fps)
    scrollerSquare: "[data-bench-scroller]{border-radius:0!important}",
    nestedClipSquare: "[data-bench-nested-clip]{border-radius:0!important}",
    // Nested scrollers (e.g. overflow-x-auto table wrappers) stop scrolling.
    // If this alone reaches 60, the cost is a nested scroller inside a rounded
    // scroller (staffproductpurchase-embedded: 30 → 60 fps)
    nestedNotScroller:
      "[data-bench-scroller] .overflow-x-auto,[data-bench-scroller] .overflow-auto{overflow:visible!important}",
    noBlend: "*{mix-blend-mode:normal!important}",
    noMask: "*{mask-image:none!important;-webkit-mask-image:none!important}",
    // Fixed decorative layers inside the scroller (background blobs, watermarks)
    fixedToAbsolute: ".pointer-events-none.fixed{position:absolute!important}",
  };
  const style = document.createElement("style");
  document.head.appendChild(style);
  const run = () =>
    new Promise((res) => {
      const d = [];
      let last = performance.now(),
        dir = 1;
      const end = last + 3000;
      const step = (t) => {
        d.push(t - last);
        last = t;
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (scroller.scrollTop >= max - 1) dir = -1;
        else if (scroller.scrollTop <= 0) dir = 1;
        scroller.scrollTop += 30 * dir;
        t < end ? requestAnimationFrame(step) : res(d.slice(2));
      };
      requestAnimationFrame(step);
    });
  const results = [];
  for (const [name, css] of Object.entries(variants)) {
    style.textContent = css;
    await new Promise((r) => setTimeout(r, 400));
    scroller.scrollTop = 0;
    const d = await run();
    const avg = d.reduce((a, b) => a + b, 0) / d.length;
    results.push({
      variant: name,
      fps: +(1000 / avg).toFixed(1),
      slowFramesPct: +(
        (100 * d.filter((x) => x > 20).length) /
        d.length
      ).toFixed(1),
    });
  }
  style.remove();
  hideExt.remove();
  delete scroller.dataset.benchScroller;
  scroller.scrollTop = 0;
  document
    .querySelectorAll("[data-bench-nested-clip]")
    .forEach((e) => delete e.dataset.benchNestedClip);
  console.log("scroller:", scroller);
  console.table(results);
  // Infinite animations actually running, including inline-style ones a class search misses
  const inf = {};
  document
    .getAnimations()
    .filter(
      (a) => a.effect && a.effect.getComputedTiming().iterations === Infinity,
    )
    .forEach(
      (a) =>
        (inf[a.animationName || "web-animation"] =
          (inf[a.animationName || "web-animation"] || 0) + 1),
    );
  console.log("infinite animations:", inf);
})();
```

How to read the table:

- The variant that jumps to about 60 fps (with `slowFramesPct` near 0) is your cause.
- If only a combination is fast (as `noBlurOpaqueScroller` was for us), you need
  every part of that combination.
- If nothing helps, the cost is somewhere else: a large DOM, heavy images or
  canvases, or JavaScript on scroll. Record a DevTools **Performance** profile, or
  check the main thread with a `PerformanceObserver` on `long-animation-frame`
  entries.

### 4. Quick visual checks (optional)

- DevTools → Rendering → **Frame Rendering Stats**: a live FPS meter.
- DevTools → Rendering → **Paint flashing**: shows which areas repaint while scrolling.

## How to fix

1. **Remove `backdrop-blur-*` from anything that sits on a solid background**:
   cards, table containers, inputs, skeletons, empty-state icons, and modal cards
   that are already about 90% white on a dimmed backdrop. Keep the element's
   existing `bg-white/NN` colour; on a white page it looks the same.
2. **Don't blur anything that large content scrolls underneath**, such as sticky
   headers and navs over a long list. Even `backdrop-blur-sm` (8px) on a small sticky
   nav cost the dashboard 38–48 fps against 52 fps without it, because the blur
   is recomputed on every scroll frame. Use a nearly opaque background instead
   (for example `bg-white/95`). Blur is acceptable on small or short-lived overlays
   (toasts, a menu backdrop that is only visible while open). Cost grows with
   the blur radius.
3. **Give every scroll container an opaque background.** Slide-in panels, modal
   bodies and inner `overflow-y-auto` areas should have `bg-white` (or the page
   colour) on the scrolling element itself, not only on a parent.
4. **Avoid full-screen `position: fixed` decorative layers inside a scroll
   container.** Make them `absolute` so they scroll with the page (the look at the
   top of the page is unchanged; lower sections show the plain page colour) or
   remove them. To find them:
   `[...document.querySelectorAll('*')].filter(e => getComputedStyle(e).position === 'fixed' && e.offsetWidth * e.offsetHeight > 200000)`.
   A small fixed element, such as a centred logo watermark, costs only a few fps;
   whether to keep it is a design call.
5. **Don't mount the same heavy UI twice.** Check that modals and forms aren't
   rendered by both a desktop and a mobile nav at the same time.
6. **Never put `border-radius` on a scroll container** (`overflow-*: auto` or
   `scroll`). Keep the scroller square and either
   - paint the corners with small corner overlays (see `.shell-ear` in
     `css/globals.css` and `components/Navigation/DashboardLayoutShell.tsx`), or
   - put the radius on a non-clipping parent and place the scroller inside the
     parent's padding, so it never reaches the corners (see the table wrappers in
     `TableViewData.tsx`). Give that inner scroller an opaque background.

   Those paths are in issue-desk-embedded. In this repo, see `.shell-ear` in
   `styles/globals.css` and
   `components/Reusables/ReuseLayoutShell/ReusableLayoutShell.jsx`. A rounded
   scroller with no nested scroller inside it measured free here, but it becomes
   expensive as soon as a table or other `overflow-*-auto` element inside it
   overflows, so keep page shells square anyway.

7. **Remove infinite animations from anything always on screen**: row icons,
   decorative previews and ambient glows, especially on blurred (`filter: blur`)
   elements. Keep them only for short-lived loading states. For entrance
   animations whose end state is the element's natural style, use
   `animation-fill-mode: backwards`, not `forwards`.
8. **Avoid `mix-blend-mode` on large decorative elements.** `mix-blend-multiply`
   over white looks the same as normal blending, yet it cost the
   staffproductpurchase-embedded landing page about 10–15 fps.
9. In requisitions_automation, shadows, radius, masks and transitions didn't need
   changing. Radius and animations did here, so measure with the benchmark
   before deciding.

Useful searches:

```sh
grep -rn "backdrop-blur" --include=*.tsx --include=*.jsx --include=*.js --include=*.ts app components
grep -rn "overflow-y-auto\|overflow-auto" --include=*.tsx --include=*.jsx app components
# Rounded scrollers (check each hit for a rounded-* class on the same element)
grep -rnE "overflow-(x-|y-)?(auto|scroll)[^\"]*rounded|rounded[^\"]*overflow-(x-|y-)?(auto|scroll)" --include=*.tsx app components
# Infinite animations, including inline styles
grep -rnE "animate-(pulse|spin|ping|bounce)|infinite" --include=*.tsx --include=*.css app components css
```

## Verify

Rerun the benchmark from step 3 on the same pages, full-screen and in front, and
compare its `baseline` row with the one from before the fix. Aim for 50–60 fps
with `slowFramesPct` under about 15%.
