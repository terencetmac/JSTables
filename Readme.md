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
1. data (Array) -> Load your data as an array of objects
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
    { width: 20% },
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
