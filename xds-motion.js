/**
 * XDS motion — sliding hover highlight
 *
 * Recreates the xds.pages.twitter.biz sidebar interaction: a single
 * translucent pill glides between items as the pointer moves across a
 * list, instead of each item flashing its own background.
 *
 * One fixed-position pill serves every registered container (sidebar,
 * table of contents, content tab bars). Moving within a container
 * slides the pill; entering a different container or arriving fresh
 * fades it in at rest; leaving fades it out. The CSS hover backgrounds
 * remain as a no-JS fallback and are suppressed under html.xds-motion.
 *
 * Honors prefers-reduced-motion by not initializing at all.
 */
(function () {
  if (window.__xdsMotion) return;
  window.__xdsMotion = true;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var CONTAINERS = [
    { root: '#sidebar-content', item: 'a, button', inset: 1, radius: 8 },
    { root: '#table-of-contents', item: 'a', inset: 1, radius: 8 },
    { root: '[data-component-part="tabs-list"]', item: '[data-component-part="tab-button"]', inset: 5, radius: 8 }
  ];

  var pill = null;
  var activeRoot = null;
  var hideTimer = null;

  function ensurePill() {
    if (pill && document.body.contains(pill)) return pill;
    pill = document.createElement('div');
    pill.id = 'xds-hover-pill';
    pill.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pill);
    return pill;
  }

  function findTarget(node) {
    for (var i = 0; i < CONTAINERS.length; i++) {
      var c = CONTAINERS[i];
      var root = node.closest && node.closest(c.root);
      if (!root) continue;
      var item = node.closest(c.item);
      if (item && root.contains(item)) {
        return { item: item, root: root, cfg: c };
      }
    }
    return null;
  }

  function moveTo(target) {
    var p = ensurePill();
    var r = target.item.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    var inset = target.cfg.inset;
    var slide = activeRoot === target.root && p.style.opacity === '1';

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    // Fresh appearance (or container switch): jump into place, then fade in.
    if (!slide) {
      p.style.transition = 'opacity 120ms ease';
    } else {
      p.style.transition =
        'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), ' +
        'width 180ms cubic-bezier(0.4, 0, 0.2, 1), ' +
        'height 180ms cubic-bezier(0.4, 0, 0.2, 1), ' +
        'opacity 120ms ease';
    }

    p.style.width = r.width + 'px';
    p.style.height = r.height - inset * 2 + 'px';
    p.style.borderRadius = target.cfg.radius + 'px';
    p.style.transform = 'translate(' + r.left + 'px, ' + (r.top + inset) + 'px)';
    p.style.opacity = '1';
    activeRoot = target.root;
  }

  function hide() {
    if (!pill) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      pill.style.opacity = '0';
      activeRoot = null;
    }, 40);
  }

  document.addEventListener('mouseover', function (e) {
    if (!e.target || e.target.nodeType !== 1) return;
    var target = findTarget(e.target);
    if (target) {
      moveTo(target);
    } else {
      hide();
    }
  }, true);

  // Positions go stale the moment anything scrolls or resizes.
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);

  /* ----------------------------------------------------------------
     Sliding active-tab underline (XDS Tabs: "an indicator that
     slides as the selection changes").

     FLIP handoff: on click, measure the outgoing active tab and the
     clicked tab, slide a fixed 2px bar between the two underline
     positions, then remove it and let the static CSS indicator on
     the newly active button take over. While animating, the list
     carries .xds-tab-animating so the static borders stay hidden
     and only the moving bar shows.
     ---------------------------------------------------------------- */
  var TAB_LIST = '[data-component-part="tabs-list"]';
  var TAB_BTN = '[data-component-part="tab-button"]';
  var indicator = null;
  var indicatorTimer = null;

  function clearIndicator() {
    if (indicatorTimer) {
      clearTimeout(indicatorTimer);
      indicatorTimer = null;
    }
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
    indicator = null;
    var animating = document.querySelectorAll('.xds-tab-animating');
    for (var i = 0; i < animating.length; i++) {
      animating[i].classList.remove('xds-tab-animating');
    }
  }

  document.addEventListener('click', function (e) {
    if (!e.target || e.target.nodeType !== 1) return;
    var btn = e.target.closest && e.target.closest(TAB_BTN);
    if (!btn) return;
    var list = btn.closest(TAB_LIST);
    if (!list) return;

    // The outgoing tab is still marked active at click time —
    // React flips data-active after this handler runs.
    var from = list.querySelector(TAB_BTN + '[data-active="true"]');
    if (!from || from === btn) return;

    clearIndicator();

    var a = from.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    if (a.width === 0 || b.width === 0) return;

    list.classList.add('xds-tab-animating');

    indicator = document.createElement('div');
    indicator.id = 'xds-tab-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.width = a.width + 'px';
    indicator.style.transform = 'translate(' + a.left + 'px, ' + (a.bottom - 2) + 'px)';
    document.body.appendChild(indicator);

    // Next frame: slide to the incoming tab's underline position.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!indicator) return;
        indicator.style.width = b.width + 'px';
        indicator.style.transform = 'translate(' + b.left + 'px, ' + (b.bottom - 2) + 'px)';
      });
    });

    indicatorTimer = setTimeout(clearIndicator, 240);
  }, true);

  window.addEventListener('scroll', clearIndicator, true);
  window.addEventListener('resize', clearIndicator);

  document.documentElement.classList.add('xds-motion');
})();
