/* Blogs page: search, filter by site and "show more" over the cards. Every card is in the page's HTML, so without
   JavaScript the whole list is simply visible; this only trims it to a first screenful and filters it. */
(function () {
  'use strict';
  var root = document.getElementById('pi-blogs');
  if (!root) return;
  var cards = Array.prototype.slice.call(root.querySelectorAll('.pi-blogs__card'));
  var pills = Array.prototype.slice.call(root.querySelectorAll('.pi-blogs__pill'));
  var input = root.querySelector('input');
  var more = root.querySelector('.pi-blogs__more');
  var none = root.querySelector('.pi-blogs__none');
  var count = root.querySelector('.pi-blogs__count');
  var PAGE = 12, shown = PAGE, query = '', site = '';

  function render() {
    var match = cards.filter(function (c) {
      var onSite = !site || (' ' + c.getAttribute('data-s') + ' ').indexOf(' ' + site + ' ') >= 0;
      return onSite && (!query || c.getAttribute('data-q').indexOf(query) >= 0);
    });
    cards.forEach(function (c) { c.hidden = true; });
    match.slice(0, shown).forEach(function (c) { c.hidden = false; });
    more.hidden = match.length <= shown;
    none.hidden = match.length > 0;
    count.textContent = (query || site) ? match.length + ' of ' + cards.length + ' articles' : cards.length + ' articles';
  }
  input.addEventListener('input', function () { query = input.value.trim().toLowerCase(); shown = PAGE; render(); });
  pills.forEach(function (b) {
    b.addEventListener('click', function () {
      site = b.getAttribute('data-s'); shown = PAGE;
      pills.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      render();
    });
  });
  more.addEventListener('click', function () { shown += PAGE; render(); });
  render();
})();
