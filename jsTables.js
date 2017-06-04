const Utils = (function() {

  var upperCase = function(input) {
    return input.substr(0, 1).toUpperCase() + input.substr(1);
  }

  return {
    uc: upperCase
  }

})();

class JsTable {
  constructor(el, config) {
    this.$el = document.getElementById(el);
    this.$actionBar = document.getElementById(`${el}_action`);
    this.data = config.data;
    this.columns = config.columns;
    this.pagination = config.pagination || true ;

    this._pages = {};
    this._showingPage = 0;
    this._pageLimit = 10;
    this._showHideBox = false;
    this._searchData;

    this.initialize();
  }

  initialize() {
    // #1 if no this.columns, what is default?
    
    // #2 if have this.columns
    if (this.columns) {
      // generate Table Header
      this.updateTableHeaders();
      this.addEventListeners();
    }

    // Populate data
    if (this.data) {
      this.populateTable(this.data);
    }
    this.generatePages(this.data);
    this.showActionBar();
    this.showSearch();

    if (this.pagination) {
      this.showPaginationBar();
      this.showHideBox();
    }
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
      tHeader.textContent = column.label ? column.label : Utils.uc(column.data);
      tRow.appendChild(tHeader);
    });

    tHead.appendChild(tRow);
    this.$el.appendChild(tHead);
  }

  showActionBar() {
    // let actionBar = document.createElement('div');
    // this.$el.parentElement.appendChild(actionBar);
    let showHideBox = document.getElementById('data_table_show-columns');
    showHideBox.addEventListener('click',(e) => {
      let box = document.getElementById('data_table_show');
      this._showHideBox = !this._showHideBox;
      box.style.display = this._showHideBox ? 'block' : 'none';
    });
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

      let tBody = document.createElement('tbody');
      let tRow = document.createElement('tr');
      let td = document.createElement('td');
      td.textContent = 'No matching records found';
      td.style.textAlign = 'center';
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
    let showHide = document.getElementById('data_table_show');
    
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
    // populate page navs
    
    let paginationBar = document.getElementById('data_table_pagination');
    let paginationPrev = document.getElementById('data_table_pagination--prev')
    let paginationNext = document.getElementById('data_table_pagination--next')

    paginationBar.addEventListener('click', (e) => {
      console.log(e);
      if (e.target.tagName === 'A') {
        let toPage = e.target.getAttribute('data-page');
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
  }

  updatePaginationBar() {
    // #1 Pagination Nav pages
    let navPages = document.getElementById('data_table_pagination--nav-pages');
    navPages.innerHTML = '';
    Object.keys(this._pages).forEach((key, index) => {
      let forPage = document.createElement('a');
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
    let pageInfoUpdates = pageInfo.getElementsByTagName('span');
    pageInfoUpdates[0].textContent = (this._showingPage * this._pageLimit) + 1;
    pageInfoUpdates[1].textContent = Math.min((this._showingPage + 1) * this._pageLimit, this.data.length);
    pageInfoUpdates[2].textContent = this.data.length;

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
      }
    });
    this.$actionBar.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT') {
        this._pageLimit = e.target.value;
        this.generatePages();
        this.updatePaginationBar();
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
        console.log(this._showingPage)
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
    console.log('window.load')
    var table = new JsTable('data_table', {
      data: sampleData,
      columns: [
        { data: 'name' },
        { data: 'position' },
        { data: 'office' },
        { data: 'age' },
        { data: 'start_date', label: 'Start Date' },
        { data: 'salary' }
      ]
    });
  });

})();