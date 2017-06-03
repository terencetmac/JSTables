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
    }

    // Populate data
    if (this.data) {
      let tBody = document.createElement('tbody');
      this.data.forEach((dataRow) => {
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