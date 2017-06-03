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
    this.data = config.data;
    this.columns = config.columns;

    this.initialize();
  }

  initialize() {
    // #1 if no this.columns, what is default?
    
    // #2 if have this.columns
    if (this.columns) {
      // generate Table Header
      let tHead = document.createElement('thead');
      let tRow = document.createElement('tr');

      this.columns.forEach((column, key) => {
        let tHeader = document.createElement('th');
        tHeader.textContent = column.label ? column.label : Utils.uc(column.data);
        tRow.appendChild(tHeader);
      });

      tHead.appendChild(tRow);
      this.$el.appendChild(tHead);
      this.addEventListeners();
    }

    // Populate data
    if (this.data) {
      this.populateTable(this.data);
    }
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
  }

  sort(index, type) {
    let compare = type === 'ascending' ? 1 : -1;
    const key = this.columns[index].data;
    // for each data
    this.data.sort((a, b) => {
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
    this.populateTable(this.data);
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