/* Accordion (FAQ sections). Behaviour of the shadcn / Base UI Accordion:
   - one item open at a time (data-type="single", the default), or several with data-type="multiple";
   - the trigger is a <button> with aria-expanded / aria-controls, the panel a role="region";
   - Up / Down / Home / End move between triggers; Enter and Space toggle (native button behaviour);
   - closed panels are `inert`, so nothing inside them can be focused or read until the item opens;
   - an item whose id is in the URL hash is opened and scrolled to.
   The markup is rendered ahead of time (tools/faq-accordion.mjs) with the first item open; this file wires it up. */
(function () {
  'use strict';

  function setOpen(item, open) {
    var btn = item.querySelector('.pi-acc__trigger');
    var panel = item.querySelector('.pi-acc__panel');
    item.setAttribute('data-state', open ? 'open' : 'closed');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) {
      if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
    }
  }

  function init(root) {
    var multiple = root.getAttribute('data-type') === 'multiple';
    var items = Array.prototype.slice.call(root.querySelectorAll('.pi-acc__item'));
    var triggers = items.map(function (it) { return it.querySelector('.pi-acc__trigger'); });

    items.forEach(function (item) { setOpen(item, item.getAttribute('data-state') === 'open'); });

    items.forEach(function (item) {
      var btn = item.querySelector('.pi-acc__trigger');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var willOpen = item.getAttribute('data-state') !== 'open';
        if (willOpen && !multiple) items.forEach(function (other) { if (other !== item) setOpen(other, false); });
        setOpen(item, willOpen);
      });
    });

    root.addEventListener('keydown', function (e) {
      var i = triggers.indexOf(document.activeElement);
      if (i < 0) return;
      var to = -1;
      if (e.key === 'ArrowDown') to = (i + 1) % triggers.length;
      else if (e.key === 'ArrowUp') to = (i - 1 + triggers.length) % triggers.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = triggers.length - 1;
      if (to < 0) return;
      e.preventDefault();
      triggers[to].focus();
    });

    // deep link: #<item id>
    var hash = location.hash && location.hash.slice(1);
    if (hash) {
      var target = root.querySelector('[id="' + hash.replace(/"/g, '') + '"]');
      var owner = target && target.closest('.pi-acc__item');
      if (owner) {
        if (!multiple) items.forEach(function (other) { if (other !== owner) setOpen(other, false); });
        setOpen(owner, true);
        setTimeout(function () { owner.scrollIntoView({ block: 'center' }); }, 60);
      }
    }
  }

  var roots = document.querySelectorAll('.pi-acc');
  for (var i = 0; i < roots.length; i++) init(roots[i]);
})();
