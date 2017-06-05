const Utils = (function() {
  const upperCase = function(input) {
    return input.substr(0, 1).toUpperCase() + input.substr(1);
  }

  return {
    uc: upperCase
  }
})();

class JsTable {
  constructor(el, config) {
    this.name = el;
    this.$el = document.getElementById(el);
    this.$wrapper;
    this.data = config.data;
    this.columns = config.columns;
    this.columnProps = config.columnProps;
    this.pagination = config.pagination || true;
    // Defaults to first
    this.pageLimit = config.pageLimit || [15, 10, 25, 50, 100];
    this.rowId = config.rowId || null;

    this._pages = {};
    this._showingPage = 0;
    this._pageLimit = 10;
    this._showHideBox = false;
    this._searchData = [];
    this._cellEditId = 0;
    this._cellEditCache;
    this._rowIdPrefix = 'tId';
    this._rowIdCounter = 1;  

    this.initialize();
  }

  initialize() {
    // Create Wrapper & Load Components
    const wrapper = document.createElement('div');
    this.$wrapper = wrapper;
    wrapper.id = `${this.name}_wrapper`;
    this.$el.width = '100%';
    this.$el.parentElement.insertBefore(wrapper, this.$el);
    wrapper.appendChild(this.$el);

    this.showActionBar();
    this.showSearch();

    if (this.pagination) {
      this.showPaginationBar();
      this.showHideBox();
    }

    // Process Data
    // #1 if no this.columns, what is default?
    // #2 if have this.columns
    if (this.columns) {
      // generate Table Header
      this.updateTableHeaders();
      this.addEventListeners();
    }

    // Populate data
    if (this.data) {
      // Add row IDs to Data
      if (!this.rowId) {
        this.data.forEach(row => {
          row[this._rowIdPrefix] = this._rowIdCounter++;
        });
      }
      this.populateTable(this.data);
    }
    this.generatePages(this.data);
  }

  updateTableHeaders() {
    let oldHead = this.$el.getElementsByTagName('thead')[0];
    if (oldHead) {
      oldHead.remove();
    }
    let tHead = document.createElement('thead');
    let tRow = document.createElement('tr');

    this.columns.forEach((column, key) => {
      let tHeader = document.createElement('th');

      if (this.columnProps[key] && this.columnProps[key].width) {
        tHeader.width = this.columnProps[key].width;
      }
      tHeader.textContent = column.label ? column.label : Utils.uc(column.data);
      tRow.appendChild(tHeader);
    });

    tHead.appendChild(tRow);
    this.$el.appendChild(tHead);
  }

  showActionBar() {
    const actionBar = document.createElement('div');
    actionBar.id = `${this.name}_actionBar`;

    // Show table action
    const actionBox = document.createElement('div');
    const actionBoxLabel = document.createElement('label')
    const actionBoxSelect = document.createElement('select');
    actionBoxSelect.id = `${this.name}_action`;

    const options = this.pageLimit.map((limit, i) => {
      let lim = document.createElement('option');
      if (i === 0) {
        lim.selected = true;
      }
      lim.textContent = limit;
      return lim;
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
      actionBoxSelect.appendChild(option);
    });

    actionBoxLabel.append('Show ', actionBoxSelect, ' entries');
    actionBox.style.display = 'inline-block';

    actionBar.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT') {
        this._pageLimit = e.target.value;
        this.generatePages();
        this.updatePaginationBar();
      }
    });

    actionBox.appendChild(actionBoxLabel);
    actionBar.appendChild(actionBox);
    
    // Show showHide
    const showHideToggle = document.createElement('span');
    showHideToggle.id = `${this.name}_show--toggle`;
    showHideToggle.classList.add('t-btn', 't-btn-outline');
    showHideToggle.style.float = 'right';
    showHideToggle.textContent = 'Show Columns';

    const showHideDropdown = document.createElement('div');
    showHideDropdown.id = `${this.name}_show--dropdown`;
    showHideDropdown.classList.add('t-show');
    showHideDropdown.style.display = 'none';

    showHideToggle.appendChild(showHideDropdown);

    actionBar.appendChild(showHideToggle);

    showHideToggle.addEventListener('click',(e) => {
      let box = document.getElementById('data_table_show--dropdown');
      this._showHideBox = !this._showHideBox;
      box.style.display = this._showHideBox ? 'block' : 'none';
      showHideToggle.classList.toggle('pressed');
    });

    // Show Search
    const searchBox = document.createElement('div');
    searchBox.id = `${this.name}_searchBox`;
    searchBox.classList.add('t-search');

    const searchInput = document.createElement('input');
    searchInput.id = `${this.name}_search`;
    searchInput.classList.add('t-search__input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';

    searchBox.appendChild(searchInput);
    actionBar.appendChild(searchBox);

    this.$wrapper.insertBefore(actionBar, this.$el);
  }

  showSearch() {
    let search = document.getElementById('data_table_search');
    search.addEventListener('input', (e) => {
      let target = e.target.value.toLowerCase();

      this._searchData = this.data.filter(row => {
        let found = false;
        for (let key in row) {
          let searchable = this.columns.filter(col => {
            return col.data === key;
          });
          if (searchable.length === 0) {
            continue;
          }
          // check each item in the object
          if (row[key].toString().toLowerCase().indexOf(target) >= 0) {
            found = true;
          }
        }
        return found;
      });

      if (this._searchData.length > 0) {
        return this.generatePages(this._searchData);
      }

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
      this.$el.appendChild(tBody);

    });

    search.addEventListener('keyup', (e) => {
      if (e.keyCode === 27 && e.target.value) {
        search.value = '';
        this.generatePages();
      }
    })
  }

  showHideBox() {
    let showHide = document.getElementById('data_table_show--dropdown');

    this.columns.forEach((column, index) => {
      let col = document.createElement('label');
      let checkBox = document.createElement('input');
      checkBox.type = 'checkbox';
      checkBox.checked = true;
      checkBox.value = column.data;
      checkBox.setAttribute('data-order', index);
      col.append(checkBox, column.label ? column.label : Utils.uc(column.data));
      col.classList.add('t-show__col');
      showHide.appendChild(col);
    });

    showHide.addEventListener('change', (e) => {
      console.log(e, e.target.checked)
      if (e.target.checked === true) {
        let i = e.target.getAttribute('data-order');
        this.columns.splice(i, null, {data: e.target.value});
      } else {
        this.columns = this.columns.filter(col => {
          return col.data !== e.target.value;
        });
      }
      this.updateTableHeaders();
      this.generatePages();
    });
  }

  showPaginationBar() {
    
    // Generate Page Navigation Bar components    
    const paginationBar = document.createElement('div');
    paginationBar.id = `${this.name}_pagination`;
    paginationBar.classList.add('t-page');

    // Generate Pagination Nav Component
    const paginationNav = document.createElement('div');
    paginationNav.id = `${this.name}_pagination--nav`;
    paginationNav.classList.add('t-page__nav');
    
    const paginationPrev = document.createElement('a');
    paginationPrev.id = `${this.name}_pagination--prev`;
    paginationPrev.textContent = 'Previous';
    paginationPrev.classList.add('t-page__btn', 't-btn');
    
    const paginationNext = document.createElement('a');
    paginationNext.id = `${this.name}_pagination--next`;
    paginationNext.textContent = 'Next';
    paginationNext.classList.add('t-page__btn', 't-btn');
    
    const paginationPages = document.createElement('span');
    paginationPages.id = `${this.name}_pagination--nav-pages`;
    paginationPages.classList.add('t-page__pages');

    paginationNav.appendChild(paginationPrev);
    paginationNav.appendChild(paginationPages);
    paginationNav.appendChild(paginationNext);

    // Generate Pagination Info Component
    const paginationInfo = document.createElement('div');
    paginationInfo.id = `${this.name}_pagination--info`;
    paginationInfo.classList.add('t-page__info');
    paginationInfo.innerHTML = 'Showing <span>0</span> to <span>0</span> of <span>0</span> entries.';
    
    paginationBar.appendChild(paginationInfo);
    paginationBar.appendChild(paginationNav);

    paginationBar.addEventListener('click', (e) => {
      console.log(e);
      const toPage = e.target.getAttribute('data-page');
      if (e.target.tagName === 'A' && toPage) {
        const event = new CustomEvent('t:update', {
          detail: {
            showPage: toPage - 1
          }
        });
        this.$el.dispatchEvent(event);
      } else if (e.target.id === 'data_table_pagination--next') {
        if (!e.target.classList.contains('disabled')) {
          const event = new CustomEvent('t:update', {
            detail: {
              showPage: this._showingPage + 1
            }
          });
          this.$el.dispatchEvent(event);
        }
      } else if (e.target.id === 'data_table_pagination--prev') {
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

    this.$wrapper.appendChild(paginationBar);
  }

  updatePaginationBar() {
    // #1 Pagination Nav pages
    let navPages = document.getElementById('data_table_pagination--nav-pages');
    navPages.innerHTML = '';
    Object.keys(this._pages).forEach((key, index) => {
      let forPage = document.createElement('a');
      forPage.classList.add('t-btn');
      forPage.setAttribute('data-page', index + 1);
      forPage.textContent = index + 1;
      if (this._showingPage === index) {
        forPage.classList.add('active');
      }
      navPages.appendChild(forPage);
    });

    let prevBtn = document.getElementById('data_table_pagination--prev');
    let nextBtn = document.getElementById('data_table_pagination--next');

    if (this._showingPage === Object.keys(this._pages).length - 1) {
      nextBtn.classList.add('disabled');
    } else {
      nextBtn.classList.remove('disabled');
    }

    if (this._showingPage === 0) {
      prevBtn.classList.add('disabled');
    } else {
      prevBtn.classList.remove('disabled');
    }

    // #2 Pagination Info
    let pageInfo = document.getElementById('data_table_pagination--info');

    // Count total entries
    const totalEntries = Object.keys(this._pages).reduce((acc, val, i) => {
      return acc + this._pages[val].length;
    }, 0);
    let pageInfoUpdates = pageInfo.getElementsByTagName('span');
    pageInfoUpdates[0].textContent = (this._showingPage * this._pageLimit) + 1;
    pageInfoUpdates[1].textContent = Math.min((this._showingPage + 1) * this._pageLimit, totalEntries);
    pageInfoUpdates[2].textContent = totalEntries;
  }

  generatePages(data = this.data) {
    const pagination = {};
    const itemsPerPage = this._pageLimit;

    data.forEach((row, i) => {
      // get first digit of divide item index by itemLimit
      let page = parseInt(i / itemsPerPage);
      // push to pagination object
      pagination[page] = pagination[page] || [];
      pagination[page].push(row);
    });
    this._pages = pagination;
    const event = new CustomEvent('t:update');
    this.$el.dispatchEvent(event);
  }

  populateTable(data) {
    // remove original table body
    const oldBody = this.$el.getElementsByTagName('tbody')[0];
    if (oldBody) {
      oldBody.remove();
    }

    let tBody = document.createElement('tbody');
    data.forEach((dataRow) => {
      let tRow = document.createElement('tr');
      tRow.setAttribute('data-tid', `${dataRow[this._rowIdPrefix]}`);
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

  addEventListeners() {
    this.$el.addEventListener('click', (e) => {
      if (e.target.tagName === 'TH') {
        // if has aria-sort, flip it
        let ariaSort = e.target.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        this.sort(e.target.cellIndex, ariaSort);

        let ths = e.target.parentElement.getElementsByTagName('th');
        for (let i = 0; i < ths.length; i++) {
          ths[i].removeAttribute('aria-sort');
          ths[i].classList.remove('ascending');
          ths[i].classList.remove('descending');
        }
        e.target.setAttribute('aria-sort', ariaSort);
        e.target.classList.add(ariaSort);
      } else if (e.target.classList.contains('t-saveBtn')) {
        const targetCell = e.target.parentElement.parentElement.childNodes[this._cellEdit[1]];
        targetCell.removeAttribute('contenteditable');
        // if content is same as cache, do nothing, otherwise, make ajax call
        if (targetCell.textContent !== this._cellEditCache) {
          this.data.forEach(row => {
            if (row[this._rowIdPrefix] === this._cellEdit[0]) {
              // update the key
              let key = this.columns[this._cellEdit[1]].data;
              row[key] = targetCell.textContent;
            }
          })
        }
        e.target.parentElement.remove();
      } else if (e.target.classList.contains('t-cancelBtn')) {
        const targetCell = e.target.parentElement.parentElement.childNodes[this._cellEdit[1]];
        targetCell.removeAttribute('contenteditable');
        targetCell.textContent = this._cellEditCache;
        e.target.parentElement.remove();
        this._cellEditCache = '';
        this._cellEdit = [];
      }
    });

    this.$el.addEventListener('dblclick', (e) => {
      console.log(e);
      if (e.target.tagName === 'TD' && document.getElementsByClassName('t-saveCancelBtn').length < 1) {
        e.target.focus();
        // cache data
        this._cellEditCache = e.target.textContent;
        this._cellEdit = [parseInt(e.target.parentElement.getAttribute('data-tid')), e.target.cellIndex];
        e.target.setAttribute('contenteditable', true);
        let saveCancelBtn = document.createElement('div');
        let saveBtn = document.createElement('span');
        saveBtn.classList.add('t-saveBtn', 't-btn');
        let cancelBtn = document.createElement('span');
        cancelBtn.classList.add('t-cancelBtn', 't-btn');
        saveCancelBtn.appendChild(saveBtn);
        saveCancelBtn.appendChild(cancelBtn);
        saveCancelBtn.classList.add('t-saveCancelBtn');
        saveCancelBtn.style.top = e.target.offsetTop - 1 + 'px';
        saveCancelBtn.style.left = e.target.offsetLeft + e.target.offsetWidth - 1 + 'px';
        e.target.parentElement.appendChild(saveCancelBtn);
      }
    });

    this.$el.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        console.log('Save cell')        
      }
    });

    // Navigate to page
    this.$el.addEventListener('t:update', (e) => {
      if (this.pagination) {
        let showPage = 0;
        if (e.detail && e.detail.showPage) {
          showPage = e.detail.showPage ;
        }
        this._showingPage = showPage;
        this.populateTable(this._pages[showPage]);
        this.updatePaginationBar();
      }
    });
  }

  sort(index, type) {
    let compare = type === 'ascending' ? 1 : -1;
    const key = this.columns[index].data;
    // for each data
    let data = this._searchData.length > 0 ? this._searchData : this.data; 
    data.sort((a, b) => {
      let aKey = typeof a[key] === 'string' ? a[key].toUpperCase() : a[key];
      let bKey = typeof b[key] === 'string' ? b[key].toUpperCase() : b[key]; 

      // compare value of key to be sorted
      if (aKey < bKey) {
        return compare;
      }
      if (aKey > bKey) {
        return -1 * compare;
      }
      return 0;      
    });
    this.generatePages(data);
  }
}

(function() {

  window.addEventListener('load', function() {
    var table = new JsTable('data_table', {
      data: sampleData,
      columns: [
        { data: 'name' },
        { data: 'position' },
        { data: 'office' },
        { data: 'age' },
        { data: 'start_date', label: 'Start Date' },
        { data: 'salary' }
      ],
      columnProps: [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    });
  });

})();