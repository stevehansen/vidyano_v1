(function ($) {
    function getColumns(data) {
        var columns = [];

        for (var i = 0; i < data.renderOptions.length; i++) {
            var option = data.renderOptions[i];

            option.name = option.propertyName;
            option.id = i;
            option.disableSort = !data.allowSort;
            columns[i] = option;
        }

        return columns;
    }
    
    function getItems(data) {
        var items = [].toSelector();

        for (var i = 0; i < data.source.length; i++) {
            var item = data.source[i];
            var values = [];

            for (var key in item) {
                if (key == "id")
                    continue;

                values.push({
                    key: key,
                    value: item[key]
                });
            }

            items[i] = {
                id: item.id,
                values: values,
                getTypeHint: $.noop
            };
        }

        return items;
    }
    
    function sortItems(items, splittedSortOptions) {
        var sort = function (a, b, sortOptions) {
            if (sortOptions == null)
                sortOptions = splittedSortOptions;

            if (!sortOptions || !sortOptions.length)
                return 0;
            
            var name = sortOptions[0].trim();
            var asc = true;
            if (name.endsWith(" DESC")) {
                asc = false;
                name = name.replace(" DESC", "");
            }
            var itemValueA = a.getFullValue(name);
            var valA = itemValueA != null ? ServiceGateway.fromServiceString(itemValueA.value, itemValueA.getColumn().type) : null;
            if (typeof (valA) == "string")
                valA = valA.toUpperCase();

            var itemValueB = b.getFullValue(name);
            var valB = itemValueB != null ? ServiceGateway.fromServiceString(itemValueB.value, itemValueB.getColumn().type) : null;

            if (typeof (valB) == "string")
                valB = valB.toUpperCase();

            if ((valA > valB && asc) || (valA < valB && !asc))
                return 1;
            else if ((valA > valB && !asc) || (valA < valB && asc))
                return -1;
            else { //pop first item in the array
                var innersort = sortOptions.slice(0);
                innersort.shift();
                return sort(a, b, innersort);
            }
        };

        items.sort(sort);
    }

    $.fn.jsonGrid = function (data) {
        var columns = getColumns(data);
        var sortOptions = "";
        if (columns.length > 0 && data.allowSort)
            sortOptions = columns[0].name;

        //create query object
        var query = new Query({ sortOptions: sortOptions, persistentObject: {}, result: { columns: columns, items: getItems(data), pageSize: 0 } });

        //hook on selecteditems changed
        if (data.onSelectedItemsChanged)
            query.items.onSelectedItemsChanged(data.onSelectedItemsChanged);

        query.onItemClicked = data.onItemClicked || $.noop;

        query.options.hideManagement = true;
        query.options.allowSelectAll = data.allowSelectAll;
        if (data.hideSelector != null)
            query.options.hideSelector = data.hideSelector;

        if (data.allowSort) {
            //override search to get javascript sort instead of server side. 
            query.search = function (onCompleted) {
                sortItems(this.items, this.sortOptions.replace(" ASC", "").split(";"));

                onCompleted();
            };
        } else {
            query.search = function (onCompleted) {
                onCompleted();
            };
        }
        if (data.selectAll)
            query.selectAll();

        var root = $(this);
        root.dataContext(query);
        root.queryGrid(query, query.options);

        query.refreshItems = function (src) {
            data.source = src;
            var selectedItems = this.items.selectedItems() || [];
            this.setResult({ columns: columns, items: getItems(data), pageSize: 0 });

            //hook on selecteditems changed
            if (data.onSelectedItemsChanged)
                this.items.onSelectedItemsChanged(data.onSelectedItemsChanged);

            if (selectedItems.length > 0)
                this.updateSelectedItems(this.items.filter(function (item) {
                    return selectedItems.firstOrDefault(function (si) { return si.id == item.id; });
                }));
        };

        return query;
    };
})(jQuery);