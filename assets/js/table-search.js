// Table search/filter utility for all main tables
(function() {
  function createSearchBar(targetId, placeholder = 'Search...') {
    const bar = document.createElement('input');
    bar.type = 'search';
    bar.className = 'input table-search-bar';
    bar.placeholder = placeholder;
    bar.style.marginBottom = '12px';
    bar.autocomplete = 'off';
    bar.setAttribute('aria-label', placeholder);
    const target = document.getElementById(targetId);
    if (target && target.parentNode) {
      target.parentNode.insertBefore(bar, target);
    }
    return bar;
  }

  function filterTableRows(table, query) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  }

  function attachSearchToTableHost(hostId) {
    const host = document.getElementById(hostId);
    if (!host) return;
    const observer = new MutationObserver(() => {
      const table = host.querySelector('table');
      if (table && !host.querySelector('.table-search-bar')) {
        const bar = createSearchBar(hostId, 'Search table...');
        bar.addEventListener('input', () => {
          filterTableRows(table, bar.value.trim().toLowerCase());
        });
      }
    });
    observer.observe(host, { childList: true, subtree: true });
  }

  [
    'recordingTableHost',
    'returnsTableHost',
    'balanceTableHost',
    'purchaseTableHost',
    'summaryTableHost'
  ].forEach(attachSearchToTableHost);
})();
