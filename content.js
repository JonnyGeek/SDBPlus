(() => {
  const isTwitch = /(^|\.)twitch\.tv$/.test(location.hostname);
  const isTarget = /(^|\.)streamdatabase\.com$/.test(location.hostname); 

  const STORAGE_KEY = 'sdbplus_badge_ids';

  // ---------- STORAGE HELPERS ----------
  async function saveIds(ids) {
    const payload = { savedAt: new Date().toISOString(), count: ids.length, ids };
    await chrome.storage.local.set({ [STORAGE_KEY]: payload });
    return payload;
  }
  async function loadIds() {
    const obj = await chrome.storage.local.get(STORAGE_KEY);
    return obj[STORAGE_KEY] || null;
  }

  // ---------- STREAMDATABASE SIDE ----------
  if (isTarget) {
    if (location.pathname === '/twitch/global-badges') {
      let userBadgeIds = new Set();
      
      async function loadUserBadges() {
        const data = await loadIds();
        if (data && data.ids) {
          userBadgeIds = new Set(data.ids);
        }
        return userBadgeIds;
      }
      
      function extractBadgeIdFromUrl(href) {
        const match = href.match(/\/twitch\/global-badges\/([^\/]+)\/\d+$/);
        return match ? match[1] : null;
      }
      
      function addBadgeStatus() {
        const badgeLinks = document.querySelectorAll('a[href*="/twitch/global-badges/"]');
        
        badgeLinks.forEach(link => {
          if (link.querySelector('[data-sdbplus="status"]') || userBadgeIds.size === 0) return;
          
          const badgeId = extractBadgeIdFromUrl(link.getAttribute('href'));
          if (!badgeId) return;
          
          const hasBadge = userBadgeIds.has(badgeId);
          
          const statusDiv = document.createElement('div');
          statusDiv.setAttribute('data-sdbplus', 'status');
          statusDiv.style.position = 'absolute';
          statusDiv.style.top = '8px';
          statusDiv.style.right = '8px';
          statusDiv.style.padding = '4px 8px';
          statusDiv.style.borderRadius = '12px';
          statusDiv.style.fontSize = '12px';
          statusDiv.style.fontWeight = '600';
          statusDiv.style.textTransform = 'uppercase';
          statusDiv.style.zIndex = '10';
          
          if (hasBadge) {
            statusDiv.textContent = 'OWNED';
            statusDiv.style.background = '#00f5c4';
            statusDiv.style.color = '#0d1117';
          } else {
            statusDiv.textContent = 'MISSING';
            statusDiv.style.background = '#f85149';
            statusDiv.style.color = '#ffffff';
          }
          
          link.style.position = 'relative';
          link.appendChild(statusDiv);
        });
      }
      
      function addFilterControls() {
        const filterBar = document.querySelector('.bg-neutral-900.rounded.p-2.flex.flex-wrap.gap-2.justify-between');
        if (!filterBar || filterBar.querySelector('[data-sdbplus="filter"]')) return;
        
        const filterCol = document.createElement('div');
        filterCol.className = 'flex flex-col';
        filterCol.setAttribute('data-sdbplus', 'filter');
        
        const filterLabel = document.createElement('label');
        filterLabel.textContent = 'Badge Status';
        filterLabel.className = 'text-neutral-500';
        filterLabel.setAttribute('for', 'sdbplus_filter');
        
        const filterSelect = document.createElement('select');
        filterSelect.id = 'sdbplus_filter';
        filterSelect.className = 'h-8 border-b-2 focus:outline-none bg-neutral-900';
        
        const options = [
          { value: 'all', text: 'All Badges' },
          { value: 'owned', text: 'Owned Only' },
          { value: 'missing', text: 'Missing Only' }
        ];
        
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          if (opt.value === 'all') option.selected = true;
          filterSelect.appendChild(option);
        });
        
        const hideRemovedCol = document.createElement('div');
        hideRemovedCol.className = 'flex flex-col';
        hideRemovedCol.setAttribute('data-sdbplus', 'hide-removed');
        
        const hideRemovedLabel = document.createElement('label');
        hideRemovedLabel.textContent = 'Removed Badges';
        hideRemovedLabel.className = 'text-neutral-500';
        hideRemovedLabel.setAttribute('for', 'sdbplus_hide_removed');
        
        const hideRemovedSelect = document.createElement('select');
        hideRemovedSelect.id = 'sdbplus_hide_removed';
        hideRemovedSelect.className = 'h-8 border-b-2 focus:outline-none bg-neutral-900';
        
        const removedOptions = [
          { value: 'show', text: 'Show All' },
          { value: 'hide', text: 'Hide Removed' },
          { value: 'only', text: 'Show Only Removed' }
        ];
        
        removedOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          if (opt.value === 'hide') option.selected = true;
          hideRemovedSelect.appendChild(option);
        });
        
        const applyFilters = () => {
          const filterValue = filterSelect.value;
          const removedFilter = hideRemovedSelect.value;
          const badgeLinks = document.querySelectorAll('a[href*="/twitch/global-badges/"]');
          
          badgeLinks.forEach(link => {
            const statusDiv = link.querySelector('[data-sdbplus="status"]');
            const isRemoved = link.classList.contains('opacity-50') || link.querySelector('p.text-red-500');
            let shouldShow = true;
            
            if (filterValue !== 'all' && statusDiv) {
              const isOwned = statusDiv.textContent === 'OWNED';
              shouldShow = (filterValue === 'owned' && isOwned) || (filterValue === 'missing' && !isOwned);
            }
            
            if (removedFilter === 'hide' && isRemoved) {
              shouldShow = false;
            } else if (removedFilter === 'only' && !isRemoved) {
              shouldShow = false;
            }
            
            const badgeContainer = link.closest('.relative') || link.parentElement || link;
            if (shouldShow) {
              badgeContainer.style.display = '';
            } else {
              badgeContainer.style.display = 'none';
            }
          });
        };
        
        filterSelect.addEventListener('change', applyFilters);
        hideRemovedSelect.addEventListener('change', applyFilters);
        
        filterCol.appendChild(filterLabel);
        filterCol.appendChild(filterSelect);
        
        hideRemovedCol.appendChild(hideRemovedLabel);
        hideRemovedCol.appendChild(hideRemovedSelect);
        
        const firstFlexContainer = filterBar.querySelector('.flex.gap-2.flex-wrap');
        if (firstFlexContainer) {
          firstFlexContainer.appendChild(filterCol);
          firstFlexContainer.appendChild(hideRemovedCol);
        }
        
        applyFilters();
      }

      async function initBadgeComparison() {
        await loadUserBadges();
        addBadgeStatus();
        addFilterControls();
      }
      
      const observer = new MutationObserver(async () => {
        if (userBadgeIds.size === 0) {
          await loadUserBadges();
        }
        addBadgeStatus();
      });
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBadgeComparison);
      } else {
        initBadgeComparison();
      }
      
      observer.observe(document.documentElement, { 
        childList: true, 
        subtree: true 
      });
    }
  }

  // ---------- TWITCH SIDE ----------
  if (isTwitch) {
    const ROOTS = [
      '[data-test-selector="global-badges-test-selector"]',
      '[data-a-target="global-badge-selector"]'
    ];
    const ITEM_SEL = '[data-badge-id]';

    function collectBadgeIds(root) {
      return [...root.querySelectorAll(ITEM_SEL)]
        .map(el => el.getAttribute('data-badge-id'))
        .filter(Boolean);
    }

    function styleBtn(btn) {
      btn.style.padding = '6px 12px';
      btn.style.borderRadius = '6px';
      btn.style.border = '1px solid #38383d';
      btn.style.cursor = 'pointer';
      btn.style.background = '#26262c';
      btn.style.color = '#efeff1';
      btn.style.fontSize = '13px';
      btn.style.fontWeight = '500';
      btn.onmouseenter = () => { if (!btn.disabled) btn.style.background = '#38383d'; };
      btn.onmouseleave = () => { if (!btn.disabled) btn.style.background = '#26262c'; };
      btn.addEventListener('disabled', () => {
        if (btn.disabled) {
          btn.style.opacity = '0.5';
          btn.style.cursor = 'pointer';
        } else {
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
      });
      const observer = new MutationObserver(() => {
        if (btn.disabled) {
          btn.style.opacity = '0.5';
          btn.style.cursor = 'pointer';
        } else {
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
      });
      observer.observe(btn, { attributes: true, attributeFilter: ['disabled'] });
    }

    function findBadgeListContainer(anchor) {
      const radio = anchor.querySelector('[data-a-target="global-badge-selector"]');
      if (radio) return radio;
      const anyItem = anchor.querySelector(ITEM_SEL);
      if (anyItem) {
        const candidates = [
          anyItem.closest('[role="radiogroup"]'),
          anyItem.closest('[class*="grid"]'),
          anyItem.parentElement
        ];
        return candidates.find(Boolean) || anchor;
      }
      return anchor;
    }

    function ensureToolbar(containerEl) {
      const anchor = containerEl.matches('[data-a-target="global-badge-selector"]')
        ? containerEl.parentElement || containerEl
        : containerEl;

      let SDBPlusSection = anchor.querySelector('[data-sdbplus="toolbar"]');
      let badgeCountText;
      if (!SDBPlusSection) {
        SDBPlusSection = document.createElement('div');
        SDBPlusSection.setAttribute('data-sdbplus', 'toolbar');
        SDBPlusSection.style.display = 'flex';
        SDBPlusSection.style.flexDirection = 'column';
        SDBPlusSection.style.flexWrap = 'wrap';
        SDBPlusSection.style.gap = '8px';
        SDBPlusSection.style.margin = '8px 0 0';
        SDBPlusSection.style.padding = '0px 4px';
        SDBPlusSection.style.alignItems = 'flex-start';
        SDBPlusSection.style.position = 'relative';
        SDBPlusSection.style.zIndex = '2147483647';

        badgeCountText = document.createElement('p');
        badgeCountText.className = 'sdbplus-badge-count';
        badgeCountText.style.fontSize = '14px';
        badgeCountText.style.color = '#efeff1';
        badgeCountText.textContent = 'Badges: ...';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.alignItems = 'center';
        btnRow.style.width = '100%';
        btnRow.style.marginBottom = '4px';

        const btnSave = document.createElement('button');
        btnSave.textContent = 'Save to SDBPlus';
        btnSave.style.textAlign = 'center';
        btnSave.style.flex = '1 1 0';
        btnSave.style.maxWidth = '100%';
        styleBtn(btnSave);
        btnSave.addEventListener('click', async () => {
          btnSave.disabled = true;
          btnSave.textContent = 'Saving...';
          
          try {
            const rootForItems = anchor.querySelector('[data-a-target="global-badge-selector"]') || anchor;
            const ids = collectBadgeIds(rootForItems);
            await saveIds(ids);
            
            btnSave.textContent = 'Saved!';
            btnSave.style.background = '#26262c';
            btnSave.style.color = '#efeff1';
            
            setTimeout(() => {
              btnSave.textContent = 'Save to SDBPlus';
              btnSave.style.background = '#26262c';
              btnSave.style.color = '#efeff1';
              btnSave.disabled = false;
            }, 2000);
          } catch (error) {
            btnSave.textContent = 'Error!';
            btnSave.style.background = '#f85149';
            setTimeout(() => {
              btnSave.textContent = 'Save to SDBPlus';
              btnSave.style.background = '#26262c';
              btnSave.disabled = false;
            }, 2000);
          }
        });

        const btnGlobalBadges = document.createElement('button');
        btnGlobalBadges.textContent = 'Global Badges';
        styleBtn(btnGlobalBadges);
        btnGlobalBadges.style.flex = '1 1 0';
        btnGlobalBadges.style.maxWidth = '100%';
        btnGlobalBadges.style.textAlign = 'center';
        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgIcon.setAttribute('width', '12');
        svgIcon.setAttribute('height', '12');
        svgIcon.setAttribute('viewBox', '0 0 20 20');
        svgIcon.style.marginLeft = '6px';
        svgIcon.style.verticalAlign = 'middle';
        svgIcon.style.marginBottom = '2px';
        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M12 4h2.586L9.293 9.293l1.414 1.414L16 5.414V8h2V2h-6v2z');
        path1.setAttribute('fill', '#efeff1');
        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', 'M4 4h6v2H4v10h10v-6h2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z');
        path2.setAttribute('fill', '#efeff1');
        svgIcon.appendChild(path1);
        svgIcon.appendChild(path2);
        btnGlobalBadges.appendChild(svgIcon);
        btnGlobalBadges.addEventListener('click', () => {
          window.open('https://www.streamdatabase.com/twitch/global-badges', '_blank', 'noopener');
        });

        btnRow.appendChild(btnSave);
        btnRow.appendChild(btnGlobalBadges);
        SDBPlusSection.appendChild(badgeCountText);
        SDBPlusSection.appendChild(btnRow);
      } else {
        badgeCountText = SDBPlusSection.querySelector('.sdbplus-badge-count');
      }

      const list = findBadgeListContainer(anchor);
      if (list && SDBPlusSection.previousSibling !== list) {
        list.insertAdjacentElement('afterend', SDBPlusSection);
      } else if (!SDBPlusSection.parentElement) {
        anchor.appendChild(SDBPlusSection);
      }

      if (badgeCountText) {
        const rootForItems =
          anchor.querySelector('[data-a-target="global-badge-selector"]') || anchor;
        const ids = collectBadgeIds(rootForItems);
        const newText = `You have ${ids.length} badges.`;
        if (badgeCountText.textContent !== newText) {
          badgeCountText.textContent = newText;
        }
      }
    }

    function findAnyRoot() {
      for (const sel of ROOTS) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return null;
    }

    function tryMount() {
      const root = findAnyRoot();
      if (root) ensureToolbar(root);
    }

    const mo = new MutationObserver(() => tryMount());
    mo.observe(document.documentElement, { childList: true, subtree: true });
    tryMount();
    window.SDBPlusForce = tryMount;
  }
})();
