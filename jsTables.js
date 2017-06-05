const Utils = (function() {
  const upperCase = function(input) {
    return input.substr(0, 1).toUpperCase() + input.substr(1);
  }

  return {
    uc: upperCase
  }
})();

const AJAX = (function() {
  const request = function(url) {
    const config = {
      method: 'GET',
      mode: 'cors'
    }
    return fetch(url, config)
      .then(response => {
        return response.json();
      })
      .catch(err => {
        console.log('Error retrieving data: ', err);
      });
  }

  return {
    fetch: request
  }
})();

class JsTable {
  constructor(el, config) {
    this.$el = document.getElementById(el);
    this.$wrapper;
    this.name = el;
    this.data = config.data;
    this.ajax = config.ajax;
    this.dataSrc = config.dataSrc;
    this.columns = config.columns;
    this.columnProps = config.columnProps;
    // Defaults to first
    this.pageLimit = config.pageLimit || [15, 10, 25, 50, 100];
    this.rowId = config.rowId || null;

    this.components = {
      EditCellActionBar: 't-saveCancelBtn',
      Action: {
        Bar: `${this.name}_actionBar`,
        LimitEntries: `${this.name}_limitEntries`,
        SearchBox: `${this.name}_searchBox`,
        SearchInput: `${this.name}_search`,
        ShowColumns: `${this.name}_show--toggle`,
        ShowColumnsDropdown: `${this.name}_show--dropdown`
      },
      Pagination: {
        Bar: `${this.name}_pagination`,
        Nav: `${this.name}_pagination--nav`,
        NavPages: `${this.name}_pagination--nav-pages`,
        PagerNext: `${this.name}_pagination--next`,
        PagerPrev: `${this.name}_pagination--prev`,
        Info: `${this.name}_pagination--info`
      }
    };

    this._prefix = 'jst';
    this._pages = {};
    this._showingPage = 0;
    this._pageLimit = this.pageLimit[0] || 10;
    this._showHideBox = false;
    this._searchData = [];
    this._cellEditId = 0;
    this._cellEditCache;
    this._rowIdPrefix = 'tid';
    this._rowIdCounter = 1;

    this.initialize();
  }

  initialize() {
    // Wrap table and insert other components
    this.$wrapper = this._createWrapper();
    this.$wrapper.insertBefore(this.showActionBar(), this.$el);
    this.$wrapper.appendChild(this.showPaginationBar());
    
    // Draw Table
    if (this.columns) {
      this.drawTableHeader();
      this.addTableEventListeners();
    }

    if (this.ajax) {
      this.initAjaxData();
    } else if (!this.ajax && this.data) {
      this.initData();
    }
  }

  initData() {
    if (typeof this.data.forEach === 'undefined') {
      return console.error('JS Tables Error: Cannot read data. Did you correctly identify the dataSrc string in config?')
    }

    if (!this.rowId) {
    // Add row IDs to Data
      this.data.forEach(row => {
        row[this._rowIdPrefix] = this._rowIdCounter++;
      });
    }
    this.generatePages(this.data);
  }

  initAjaxData() {
    AJAX.fetch(this.ajax)
      .then(result => {
        if (this.dataSrc) {
          const params = this.dataSrc.split('.');
          let dataSource = result;
          params.forEach(param => { 
            dataSource = dataSource[param];
          });
          if (!dataSource) {
            return console.error('JS Tables Error: Cannot read data. Did you correctly identify the dataSrc string in config?')
          }
          this.data = dataSource;
        } else {
          this.data = result;
        }
        this.initData();
      });
  }

  showActionBar() {
    // Note: Consider refactoring into individual child components
    // Generate Action Bar
    const actionBar = document.createElement('div');
    actionBar.id = this.components.Action.Bar;

    // #1: Show Limit Entries
    const limitEntries = document.createElement('div');
    limitEntries.style.display = 'inline-block';

    const limitEntriesLabel = document.createElement('label')
    
    const limitEntriesSelect = document.createElement('select');
    limitEntriesSelect.id = this.components.Action.LimitEntries;

    limitEntriesLabel.append('Show ', this._fillLimitEntriesOptions(limitEntriesSelect), ' entries');
    
    limitEntries.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT') {
        this._pageLimit = e.target.value;
        const data = this._searchData.length > 0 ? this._searchData : this.data;
        this.generatePages(data);
      }
    });

    limitEntries.appendChild(limitEntriesLabel);
    actionBar.appendChild(limitEntries);
    
    // #2: Show ShowColumns
    const showColumns = document.createElement('span');
    showColumns.id = this.components.Action.ShowColumns;
    showColumns.classList.add('t-btn', 't-btn-outline');
    showColumns.style.float = 'right';
    showColumns.textContent = 'Show Columns';

    const showColumnsDropdown = document.createElement('div');
    showColumnsDropdown.id = this.components.Action.ShowColumnsDropdown;
    showColumnsDropdown.classList.add('t-show');
    showColumnsDropdown.style.display = 'none';

    showColumns.addEventListener('click',(e) => {
      const box = document.getElementById(this.components.Action.ShowColumnsDropdown);
      this._showHideBox = !this._showHideBox;
      box.style.display = this._showHideBox ? 'block' : 'none';
      showColumns.classList.toggle('pressed');
    });

    showColumns.addEventListener('change', (e) => {
      if (e.target.checked === true) {
        const i = e.target.getAttribute('data-order');
        this.columns.splice(i, null, {data: e.target.value});
      } else {
        this.columns = this.columns.filter(col => {
          return col.data !== e.target.value;
        });
      }
      this.drawTableHeader();
      const data = this._searchData.length > 0 ? this._searchData : this.data;
      this.generatePages(data);
    });

    showColumns.appendChild(this._fillShowColumnsDropdown(showColumnsDropdown));
    actionBar.appendChild(showColumns);

    // #3: Show Search Box
    const searchBox = document.createElement('div');
    searchBox.id = this.components.Action.SearchBox;
    searchBox.classList.add('t-search');

    const searchInput = document.createElement('input');
    searchInput.id = this.components.Action.SearchInput;
    searchInput.classList.add('t-search__input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';

    searchInput.addEventListener('input', (e) => {
      this.search(e.target.value);
    });
    searchInput.addEventListener('keyup', (e) => {
      if (e.keyCode === 27 && e.target.value) {
        searchInput.value = '';
        this.generatePages();
      }
    });

    searchBox.appendChild(searchInput);
    actionBar.appendChild(searchBox);

    return actionBar;
  }

  showPaginationBar() {
    // Note: Consider refactoring into individual child components
    // Generate Pagination Bar    
    const paginationBar = document.createElement('div');
    paginationBar.id = this.components.Pagination.Nav;
    paginationBar.classList.add('t-page');

    // #1: Generate Pagination Nav Component
    const paginationNav = document.createElement('div');
    paginationNav.id = this.components.Pagination.Nav;
    paginationNav.classList.add('t-page__nav');
    
    // #2: Generate Pagination Pagers
    const paginationPrev = document.createElement('a');
    paginationPrev.id = this.components.Pagination.PagerPrev;
    paginationPrev.textContent = 'Previous';
    paginationPrev.classList.add('t-page__btn', 't-btn');
    
    const paginationNext = document.createElement('a');
    paginationNext.id = this.components.Pagination.PagerNext;
    paginationNext.textContent = 'Next';
    paginationNext.classList.add('t-page__btn', 't-btn');
    
    // #3: Generate Pagination Nav Pages Links
    const paginationPages = document.createElement('span');
    paginationPages.id = this.components.Pagination.NavPages;
    paginationPages.classList.add('t-page__pages');

    paginationNav.appendChild(paginationPrev);
    paginationNav.appendChild(paginationPages);
    paginationNav.appendChild(paginationNext);

    // #4: Generate Pagination Info
    const paginationInfo = document.createElement('div');
    paginationInfo.id = this.components.Pagination.Info;
    paginationInfo.classList.add('t-page__info');
    paginationInfo.innerHTML = 'Showing <span>0</span> to <span>0</span> of <span>0</span> entries.';
    
    paginationBar.appendChild(paginationInfo);
    paginationBar.appendChild(paginationNav);

    // #5: Add Event Listeners to Pagination
    paginationBar.addEventListener('click', (e) => {
      const toPage = e.target.getAttribute('data-page');
      if (e.target.tagName === 'A' && toPage) {
        const event = new CustomEvent('t:update', {
          detail: {
            showPage: toPage - 1
          }
        });
        this.$el.dispatchEvent(event);

      } else if (e.target.id === this.components.Pagination.PagerNext) {
        if (!e.target.classList.contains('disabled')) {
          const event = new CustomEvent('t:update', {
            detail: {
              showPage: this._showingPage + 1
            }
          });
          this.$el.dispatchEvent(event);
        }
      } else if (e.target.id === this.components.Pagination.PagerPrev) {
        if (!e.target.classList.contains('disabled')) {
          const event = new CustomEvent('t:update', {
            detail: {
              showPage: this._showingPage - 1
            }
          });
          this.$el.dispatchEvent(event);
        }
      }
    });

    return paginationBar;
  }

  updatePaginationBar() {
    // #1 Update Pagination Nav Links
    const navPages = document.getElementById(this.components.Pagination.NavPages);
    navPages.innerHTML = '';
    Object.keys(this._pages).forEach((key, index) => {
      let forPage = this._drawPaginationNavLink(index);
      if (this._showingPage === index) {
        forPage.classList.add('active');
      }
      navPages.appendChild(forPage);
    });

    // #2 Update Pagination Nav Pagers
    const prevBtn = document.getElementById(this.components.Pagination.PagerPrev);
    if (this._showingPage === 0) {
      prevBtn.classList.add('disabled');
    } else {
      prevBtn.classList.remove('disabled');
    }

    const nextBtn = document.getElementById(this.components.Pagination.PagerNext);
    if (this._showingPage === Object.keys(this._pages).length - 1) {
      nextBtn.classList.add('disabled');
    } else {
      nextBtn.classList.remove('disabled');
    }

    // #3 Update Pagination Info
    const pageInfo = document.getElementById(this.components.Pagination.Info);

    const totalEntries = Object.keys(this._pages).reduce((acc, val, i) => {
      return acc + this._pages[val].length;
    }, 0);

    const pageInfoUpdates = pageInfo.getElementsByTagName('span');
    pageInfoUpdates[0].textContent = (this._showingPage * this._pageLimit) + 1;
    pageInfoUpdates[1].textContent = Math.min((this._showingPage + 1) * this._pageLimit, totalEntries);
    pageInfoUpdates[2].textContent = totalEntries;
  }

  generatePages(data = this.data) {
    const pagination = {};
    const itemsPerPage = this._pageLimit;

    data.forEach((row, i) => {
      // Use first digit to determine page number
      let page = parseInt(i / itemsPerPage);
      // Collect in Pagination object
      pagination[page] = pagination[page] || [];
      pagination[page].push(row);
    });
    this._pages = pagination;
    const event = new CustomEvent('t:update');
    this.$el.dispatchEvent(event);
  }

  drawTableHeader() {
    const oldHeader = this.$el.getElementsByTagName('thead')[0];
    if (oldHeader) {
      oldHeader.remove();
    }
    const tHead = document.createElement('thead');
    const tRow = document.createElement('tr');

    this.columns.forEach((column, key) => {
      let tHeading = document.createElement('th');

      if (this.columnProps[key] && this.columnProps[key].width) {
        tHeading.width = this.columnProps[key].width;
      }
      tHeading.textContent = column.label ? column.label : Utils.uc(column.data);
      tRow.appendChild(tHeading);
    });

    tHead.appendChild(tRow);
    this.$el.appendChild(tHead);
  }

  drawTable(data) {
    // Remove original table body
    const oldBody = this.$el.getElementsByTagName('tbody')[0];
    if (oldBody) {
      oldBody.remove();
    }

    const tBody = document.createElement('tbody');
    data.forEach((dataRow) => {
      let tRow = document.createElement('tr');
      tRow.setAttribute(`data-${this._rowIdPrefix}`, `${dataRow[this._rowIdPrefix]}`);
      // for sequence in columns
      this.columns.forEach((column, i) => {
        // grab the data[key] and populate the td
        let td = document.createElement('td');
        td.textContent = dataRow[column['data']];
        tRow.appendChild(td);
      });
      tBody.appendChild(tRow);
    });
    this.$el.appendChild(tBody);
  }

  addTableEventListeners() {
    this.$el.addEventListener('click', (e) => {
      if (e.target.tagName === 'TH') {
        // Determine type of sort based on aria-sort
        const sortType = e.target.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        return this.sortColumn(e.target, sortType);

      } else if (e.target.classList.contains('t-saveBtn')) {
        return this._editCellSave(e.target);

      } else if (e.target.classList.contains('t-cancelBtn')) { 
        return this._editCellCancel(e.target);
      }
    });

    this.$el.addEventListener('dblclick', (e) => {
      if (e.target.tagName === 'TD' && !this._getEditCellActionBar()) {
        e.target.focus();
        this._editCell(e.target);
      }
    });

    this.$el.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        this._editCellSave(e.target);       
      } else if (e.keyCode === 27) {
        e.preventDefault();
        this._editCellCancel(e.target);
      }
    });

    // Navigate to Page
    this.$el.addEventListener('t:update', (e) => {
      let showPage = 0;
      if (e.detail && e.detail.showPage) {
        showPage = e.detail.showPage ;
      }
      this._showingPage = showPage;
      this.drawTable(this._pages[showPage]);
      this.updatePaginationBar();
    });
  }

  sortColumn(column, sortType) {
    const index = column.cellIndex;
    const comparator = sortType === 'ascending' ? 1 : -1;
    const key = this.columns[index].data;

    // Use Search Data if is Currently Searching, else use Data
    const data = this._searchData.length > 0 ? this._searchData : this.data;

    data.sort((a, b) => {
      let aKey = typeof a[key] === 'string' ? a[key].toUpperCase() : a[key];
      let bKey = typeof b[key] === 'string' ? b[key].toUpperCase() : b[key];
      // Compare value of key to be sorted
      if (aKey < bKey) {
        return comparator;
      }
      if (aKey > bKey) {
        return -1 * comparator;
      }
      return 0;      
    });

    this._drawSortColumnArrows(column, sortType);
    this.generatePages(data);
  }

  search(target) {
    target = target.toLowerCase();
    
    this._searchData = this.data.filter(row => {
      let found = false;
      for (let key in row) {
        // Check if column is searchable
        const searchable = this.columns.filter(col => {
          return col.data === key;
        });
        if (searchable.length > 0) {
          // Check if the target is found in the column's value
          if (row[key] && row[key].toString().toLowerCase().indexOf(target) >= 0) {
            found = true;
          }
        }
      }
      return found;
    });

    if (this._searchData.length > 0) {
      return this.generatePages(this._searchData);
    }

    return this._drawSearchNotFound();
  }

  _editCell(targetCell) {
    // Cache data
    this._cellEditCache = targetCell.textContent;
    this._cellEdit = [parseInt(targetCell.parentElement.getAttribute(`data-${this._rowIdPrefix}`)), targetCell.cellIndex];
    targetCell.setAttribute('contenteditable', true);
    
    targetCell.parentElement.appendChild(this._drawEditCellActionBar(targetCell));
  }

  _editCellSave(save) {
    const saveCancelBtn = this._getEditCellActionBar();
    const targetCell = save.tagName !== 'TD' ? save.parentElement.parentElement.childNodes[this._cellEdit[1]] : save;
    targetCell.removeAttribute('contenteditable');
    // If content is same as cache, do nothing, otherwise save.
    if (targetCell.textContent !== this._cellEditCache) {
      this.data.forEach(row => {
        if (row[this._rowIdPrefix] === this._cellEdit[0]) {
          // Update value
          let key = this.columns[this._cellEdit[1]].data;
          row[key] = targetCell.textContent;
        }
      })
    }
    saveCancelBtn.remove();
  }

  _editCellCancel(cancel) {
    const saveCancelBtn = this._getEditCellActionBar();
    const targetCell = cancel.tagName !== 'TD' ? cancel.parentElement.parentElement.childNodes[this._cellEdit[1]] : cancel;
    targetCell.removeAttribute('contenteditable');
    // Restore Cache
    targetCell.textContent = this._cellEditCache;
    // Clear Cache
    this._cellEditCache = '';
    this._cellEdit = [];
    saveCancelBtn.remove();
  }

  _createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.id = `${this.name}_wrapper`;
    wrapper.classList.add(this._prefix);
    // Move Table into Wrapper
    this.$el.width = '100%';
    this.$el.parentElement.insertBefore(wrapper, this.$el);
    
    wrapper.appendChild(this.$el);
    return wrapper;
  }

  _getEditCellActionBar() {
    return document.getElementsByClassName(this.components.EditCellActionBar)[0];
  }

  _fillLimitEntriesOptions(select) {
    const options = this.pageLimit.map((limit, i) => {
      let opt = document.createElement('option');
      if (i === 0) {
        opt.selected = true;
      }
      opt.textContent = limit;
      return opt;
    });

    options.sort((a, b) => {
      const aKey = parseInt(a.textContent);
      const bKey = parseInt(b.textContent);
      if (aKey < bKey) {
        return -1;
      }
      if (aKey > bKey) {
        return 1;
      }
      return 0;
    });

    options.forEach(option => {
      select.appendChild(option);
    });

    return select;
  }

  _fillShowColumnsDropdown(dropDown) {
    this.columns.forEach((column, index) => {
      let col = document.createElement('label');
      let checkBox = document.createElement('input');
      checkBox.type = 'checkbox';
      checkBox.checked = true;
      checkBox.value = column.data;
      checkBox.setAttribute('data-order', index);
      col.append(checkBox, column.label ? column.label : Utils.uc(column.data));
      col.classList.add('t-show__col');
      dropDown.appendChild(col);
    });

    return dropDown;
  }

  _drawPaginationNavLink(index) {
    const forPage = document.createElement('a');
    forPage.classList.add('t-btn');
    forPage.setAttribute('data-page', index + 1);
    forPage.textContent = index + 1;
    return forPage;
  }

  _drawEditCellActionBar(targetCell) {
    const saveCancelBtn = document.createElement('div');
    saveCancelBtn.classList.add(this.components.EditCellActionBar);
    saveCancelBtn.style.top = targetCell.offsetTop - 1 + 'px';
    saveCancelBtn.style.left = targetCell.offsetLeft + targetCell.offsetWidth - 1 + 'px';

    const saveBtn = document.createElement('span');
    saveBtn.classList.add('t-saveBtn', 't-btn');
    
    const cancelBtn = document.createElement('span');
    cancelBtn.classList.add('t-cancelBtn', 't-btn');
    
    saveCancelBtn.appendChild(saveBtn);
    saveCancelBtn.appendChild(cancelBtn);
    return saveCancelBtn;
  }

  _drawSortColumnArrows(column, sortType) {
    const columns = column.parentElement.getElementsByTagName('th');
    for (let i = 0; i < columns.length; i++) {
      columns[i].removeAttribute('aria-sort');
      columns[i].classList.remove('ascending');
      columns[i].classList.remove('descending');
    }
    column.setAttribute('aria-sort', sortType);
    column.classList.add(sortType);
  }

  _drawSearchNotFound() {
    const colSpan = this.$el.getElementsByTagName('th').length;
    const tBody = document.createElement('tbody');
    const tRow = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = 'No matching records found';
    td.style.textAlign = 'center';
    td.setAttribute('colspan', colSpan);
    tRow.appendChild(td);
    
    this.$el.getElementsByTagName('tbody')[0].remove();
    tBody.appendChild(tRow);
    return this.$el.appendChild(tBody);
  }
}