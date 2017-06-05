# JS Tables #
A simple data table plugin written in plain Javascript. Not ready for production.

## Usage ##
1. Include the jsTables.js and jsTables.css files your HTML file
2. Add a basic HTML Table Tag
```HTML
  <table id="example_table"></table>
```
3. Initialise an instance of jsTable by passing in your table's ID and a config object.
```Javascript
  window.addEventListener('load', () => {
    const table = new JsTable('example_table', config);
  });
```

## Config Options ##
1. Loading Data (2 options)  
  i. As an array of objects -> data (Array)
  ```
    data: [{...}, {...}, {...}, {...}, {...}]
  ```
  ii. With AJAX  
  Specify a URL in the `ajax` option. JsTable will send a GET request. Currently only works with JSON.  

  If your data is nested within the results of the AJAX call, you have to specify a path to the data. Otherwise, you can leave this as an empty string.
  ```
    ajax: 'https://path.to.api.com/that-returns-json',
    dataSrc: 'results.data'
  ```
2. columns (Array) -> Specify headers for your table based on your data object properties. You can specify a label to overwrite the property.
```
  columns: [
    { data: 'name' },
    { data: 'position' },
    { data: 'office', label: 'Office Address'}
  ]
```
3. columnProps (Array) -> Specify column properties. Must be the same length as columns, even if not specifying any properties.
```
  columnProps: [
    { width: '20%' },
    null,
    null
  ]
```

## Features ##
1. Sorting by Table headers
2. Pagination
3. Show and hide columns
4. Search across columns
5. Edit and save any cell
