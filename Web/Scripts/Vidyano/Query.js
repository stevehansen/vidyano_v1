/// <reference path="ActionBase.js" />
/// <reference path="Application.js" />
/// <reference path="Common.js" />
/// <reference path="jQuery.js" />
/// <reference path="PersistentObject.js" />
/// <reference path="QueryColumn.js" />
/// <reference path="QueryResultItem.js" />
/// <reference path="ServiceGateway.js" />
/// <reference path="Controls/Filter.js" />
/// <reference path="Controls/QueryViewer.js" />
/// <reference path="~/Scripts/jquery-1.8.1.min.js" />

function Query(query, parent, asLookup) {
    /// <summary>Describes a Query that gives access to a collection of Persistent Objects.</summary>

    changePrototype(query, Query);

    /// <field name="id" type="String">The unique identifier of this Query's definition.</field>
    /// <field name="name" type="String">The name of this Query.</field>
    /// <field name="label" type="String">The translated label of this Query.</field>
    /// <field name="parent" type="PersistentObject">The optional parent of this Query.</field>
    query.parent = parent;
    /// <field name="pageSize" type="Number">The number of items that should be queried per page (or null to use the application defaults).</field>
    if (query.pageSize == null) query.pageSize = null;
    /// <field name="canRead" type="Boolean">Indicates whether items on this Query can be opened (i.e.: if the current user has Read rights).</field>
    if (query.canRead == null) query.canRead = false;
    if (query.offset == null) query.offset = 0;
    query.totalPages = -1;
    query.currentPage = -1;
    /// <field name="totalItems" type="Number">The total number of items for this Query.</field>
    query.totalItems = -1;
    query.pageRange = "0";
    query.filterDisplayName = null;
    query.filterChanged = false;
    /// <field name="canSearch" type="Boolean">Indicates whether the Search method can be used at the moment, is disabled during searches.</field>
    query.canSearch = true;
    /// <field name="hasSearched" type="Boolean">Indicates whether the Search has been called at least once.</field>
    query.hasSearched = false;
    /// <field name="persistentObject" type="PersistentObject">The Persistent Object that is used for the items on this Query.</field>
    query.persistentObject = new PersistentObject(query.persistentObject);
    /// <field name="sortOptions" type="String">The sort options that should be used for the Query.</field>
    query.sortOptions = isNullOrWhiteSpace(query.sortOptions) ? "" : query.sortOptions;
    query.isReference = false;
    /// <field name="actionNames" type="Array" elementType="String">Contains the names of the actions that were allowed for this instance.</field>
    query.actionNames = query.actions;
    /// <field name="actions" type="Array" elementType="ActionBase">Contains the actions for this instance.</field>
    query.actions = Actions.getActions(query.actionNames, query);
    query.container = null;
    query.target = null;
    query.filterTarget = null;
    query.spinnerTarget = null;
    /// <field name="options">Contains the options that can be set for this Query.</field>
    query.options = {};
    query.queriedPages = [];
    /// <field name="items" type="Array" elementType="QueryResultItem">Contains the items for this instance.</field>
    query.items = [].toSelector();
    query.items.onSelectedItemsChanged(function (selectedItems) {
        query.updateActions(selectedItems);

        if (query.target != null && query.target.length > 0)
            query.target.trigger("selectedItemsChanged", [query]);
    });

    /// <field name="columns" type="Array" elementType="QueryColumn">Contains the columns for this instance.</field>
    query.updateColumns(query.columns);

    if (query.result != null)
        query.setResult(query.result);

    /// <field name="filter" type="QueryFilter">The filter used for this Query.</field>
    query.filter = new QueryFilter(query);
    if (!asLookup && query.actionNames != null && query.actionNames.contains("Filter"))
        query.filter.openDefaultFilter();

    if (!query.isSystem) {
        var onPo = app.onPersistentObject[query.persistentObject.type];
        if (onPo != null && onPo.receiveQuery != null) {
            try {
                onPo.receiveQuery(query);
            }
            catch (e) {
                app.showException(e);
            }
        }
    }

    return query;
}

Query.prototype.clone = function (isReference) {
    /// <summary>Creates a clone of this instance.</summary>
    /// <param name="isReference">specifies if the close is for a Persistent Object Attribute or a Persistent Object Attribute with Reference.</param>

    if (isReference == null)
        isReference = false;

    var clone = jQuery.extend({ actions: [], columns: null, items: null }, this);

    var q = this;
    clone.columns = this.columns.select(function (col) { return col.clone(q); });
    clone.isReference = isReference;

    return clone;
};

Query.prototype.getItems = function (start, length, onComplete, onError) {
    /// <summary>Gets the items from the Query within the specified range from the service.</summary>
    /// <param name="start" type="Number">The index of the first item to get.</param>
    /// <param name="length" type="Number">The number of items to get</param>
    /// <param name="onComplete" type="Function">The function to call when the requested items are fetched from the service.</param>
    /// <param name="onError" type="Function">The function to call when an error occured.</param>
    
    if (this.totalItems >= 0) {
        if (start > this.totalItems)
            start = this.totalItems;

        if (start + length > this.totalItems)
            length = this.totalItems - start;
    }

    if (this.pageSize == 0 || length == 0) {
        onComplete(start, length);
        return;
    }

    var startPage = Math.floor(start / this.pageSize);
    var endPage = Math.floor((start + length - 1) / this.pageSize);

    while (startPage < endPage && this.queriedPages.contains(startPage))
        startPage++;
    while (endPage > startPage && this.queriedPages.contains(endPage))
        endPage--;

    if (startPage == endPage && this.queriedPages.contains(startPage)) {
        onComplete(start, length);
        return;
    }

    var clonedQuery = this.clone(this.isReference);
    clonedQuery.skip = startPage * this.pageSize;
    clonedQuery.top = (endPage - startPage + 1) * this.pageSize;
    clonedQuery.target = null;

    for (var p = startPage; p <= endPage; p++)
        this.queriedPages.push(p);

    var q = this;
    clonedQuery.search(function (result) {
        for (var n = 0; n < clonedQuery.top && (clonedQuery.skip + n < clonedQuery.totalItems) ; n++) {
            if (q.items[clonedQuery.skip + n] == null)
                q.items[clonedQuery.skip + n] = new QueryResultItem(result.items[n], q);
        }

        onComplete(start, length);
    }, onError, true);
};

Query.prototype.getObjectIdByIndex = function (index, continueWith) {
    /// <summary>Gets the ObjectId for the specified index within the resultset. This will fetch more items from the service when the supplied index is not yet in the itemset.</summary>
    /// <param name="index">The index of the result to receive the objectId from.</param>
    /// <param name="continueWith">The function to be called when the index is found.</param>

    if (index < 0 || index >= this.totalItems) {
        continueWith(null);
        return;
    }

    var q = this;
    if (index in this.items)
        continueWith(this.items[index].id);
    else
        this.getItems(index, 1, function () { continueWith(q.items[index].id); });
};

Query.prototype.hasItems = function () {
    /// <summary>Checkes if the Query has any Items.</summary>

    return this.items != null && this.items.length > 0;
};

Query.prototype.hasVisibleActions = function () {
    /// <summary>Returns a value indicating if the Query should have any visible actions.</summary>
    /// <returns type="Boolean" />

    return this.actions.where(function (a) { return a.name != "Filter" && a.name != "RefreshQuery" && a.isVisible(); }).length > 0;
};

Query.prototype.onItemClicked = function (selectedItem) {
    /// <summary>Is called when an item is clicked in a Query.</summary>

    if (!this.canRead)
        return;

    var q = this;
    app.gateway.getPersistentObject(this.parent, this.persistentObject.id, selectedItem.id, function (result) {
        result.ownerQuery = q;
        result.ownerQueryIndex = q.items.indexOf(selectedItem);

        app.openPersistentObject(result);
    });
};

Query.prototype.open = function (container, persistentObjectContainer, persistentObjectActionsContainer) {
    /// <summary>Displays the Query in the specified container. </summary>
    /// <param name="container" type="jQuery">The container to render the Query in. If none is supplied, the element with id "content" will be used.</param>
    /// <param name="persistentObjectContainer" type="jQuery">The persistent object container used when this Query is rendered in Master-Detail mode.</param>
    /// <param name="persistentObjectActionsContainer" type="jQuery">The jQuery element that will be used to render the action. If none is specified the element with class "resultActions" will be used.</param>

    if (app.isCore)
        return;

    this.container = container;

    if (this.container == null) {
        // Query has been opened as full page query view

        this.container = $("#content");
        this.container.html($($.browser.mobile ? "#query_mobile_template" : "#query_template").html());

        this.container.dataContext(this);
        var containerContent = this.container.find(".resultContent");
        containerContent.addClass("-vi-" + this.persistentObject.type);
        containerContent.queryViewer(this, this.options);
        this.container.actionBarExpander();
    }
    else {
        this.container.dataContext(this);
        this.container.queryViewer(this, this.options);
    }

    this.showNotification(this.notification, this.notificationType);
    this.updateTitle();

    var resultPanel = (persistentObjectContainer != null ? persistentObjectContainer : this.container).find(".resultPanel");

    persistentObjectActionsContainer = persistentObjectActionsContainer == null ? this.container.find(".resultActions") : persistentObjectActionsContainer;
    if (this.hasVisibleActions()) {

        resultPanel.removeClass("noQueryActions");
        Actions.showActions(this.actions.where(function (a) { return a.name != "Filter"; }), persistentObjectActionsContainer);
    }
    else {
        resultPanel.addClass("noQueryActions");
        Actions.showActions([], persistentObjectActionsContainer);
    }

    var q = this;
    var render = function () {
        if (q.container.dataContext() != q)
            return;

        var panel = persistentObjectContainer == null ? q.container.find(".resultPanel") : persistentObjectContainer.find(".resultPanel");
        if (q.actionNames != null && q.actionNames.contains("Filter")) {
            panel.addClass("searchActive");

            (persistentObjectContainer == null ? q.container : persistentObjectContainer).find(".search").createSearch(q);
        }
        else
            panel.removeClass("searchActive");

        q.postRender();
    };

    if (this.autoQuery && !this.hasSearched && (isNullOrWhiteSpace(this.notification) || this.notificationType != "Error"))
        this.search(render);
    else
        render();
};

Query.prototype.postRender = function () {
    var code = app.code[this.id];
    if (code != null) {
        var postRenderCode = code["postRender"];
        if (postRenderCode != null)
            postRenderCode(this.container, this);
    }

    app.postQueryRender(this.container, this);
};

Query.prototype.search = function (onCompleted, onError, skipSpin) {
    /// <summary>Executes a search on the Query.</summary>
    /// <param name="onCompleted" type="Function">The optional function that will be called when the search action has completed the service request.</param>
    /// <param name="onError" type="Function">The optional function that will be called when the action has generated an error.</param>
    /// <param name="skipSpin" type="Boolean">Defines if the User Interface should display a spinner. When the value is true, the User Interface will not display a spinner.</param>

    if (this.canSearch) {
        if (this.container != null && this.spinnerTarget != null && skipSpin != true && this.container.dataContext() == this) {
            this.spinnerTarget.spin(app.settings.defaultSpinnerOptions);

            var oldOnCompleted = onCompleted;
            var oldOnError = onError;
            
            var q = this;
            onCompleted = function (result) {
                q.spinnerTarget.spin(false);

                if (oldOnCompleted != null)
                    oldOnCompleted(result);
            };
            onError = function(e) {
                q.spinnerTarget.spin(false);

                if (oldOnError != null)
                    oldOnError(e);
            };
        }

        this.queriedPages = [];

        app.gateway.executeQuery(this.parent, this, this.filterDisplayName, this.isReference, onCompleted, onError);
    }
};

Query.prototype.selectAll = function () {
    /// <summary>Selects all the items in the Query, will also load all items as a side-effect. WARNING: Do not call on big queries as it will query all items.</summary>

    var self = this;
    this.getItems(0, this.totalItems, function () { self.updateSelectedItems(self.items); });
};

Query.prototype.selectNone = function () {
    /// <summary>Selects no items in the Query.</summary>

    this.items.selectedItems([]);
};

Query.prototype.setResult = function (result) {
    /// <summary>Updates the Query with the values of the supplied query.</summary>
    /// <param name="result">The Query instance received from the service, used to update the values of the Query.</param>

    this.pageSize = result.pageSize || 0;
    if (this.currentPage != 0 && this.currentPage != result.currentPage)
        this.updateSelectedItems([]);
    this.currentPage = result.currentPage || 0;

    if (this.pageSize > 0) {
        this.totalPages = result.totalPages || 0;

        if (this.totalPages < this.currentPage) {
            this.currentPage = Math.max(this.totalPages, 1);
        }

        this.totalItems = result.totalItems || 0;
        this.queriedPages.push(Math.floor((this.skip || 0) / this.pageSize));
    }
    else {
        this.totalItems = result.items.length;
    }

    var q = this;
    var newItems = result.items.select(function (item) { return new QueryResultItem(item, q); });

    this.updateColumns(result.columns);

    this.items = newItems.toSelector();
    this.updateActions(this.items.selectedItems());
    this.items.onSelectedItemsChanged(function (selectedItems) {
        q.updateActions(selectedItems);

        if (q.target != null && q.target.length > 0)
            q.target.trigger("selectedItemsChanged", [q]);
    });

    if (this.hasItems()) {
        if (this.pageSize == 0)
            this.pageRange = "1-" + this.totalItems;
        else
            this.pageRange = (((this.currentPage - 1) * result.pageSize) + 1) + "-" + (this.currentPage * result.pageSize - (result.pageSize - result.items.length));
    } else {
        this.pageRange = "0";
    }

    this.filterChanged = false;
    this.hasSearched = true;

    this.showNotification(result.notification, result.notificationType);
    this.updateTitle();

    if (this.target != null && this.target.length > 0)
        this.target.trigger("itemsChanged", [this]);
};

Query.prototype.showNotification = function (notification, type) {
    /// <summary>Shows the specified notification on the Query.</summary>
    /// <param name="notification">The notification to show.</param>
    /// <param name="type">The optional type of notification to show, defaults to "Error".</param>

    this.notification = notification;
    this.notificationType = type || "Error";

    if (this.container != null) {
        var notificationTarget = this.container.find(".queryNotification");
        if (notificationTarget.length > 0)
            notificationTarget.showNotification(notification, type);
    }
};

Query.prototype.toServiceObject = function () {
    /// <summary>Creates an optimized copy that can be sent to the service.</summary>
    /// <returns type="Query">Returns a copy of the Query that is optimized to send to the service.</returns>

    var result = copyProperties(this, ["id", "name", "label", "pageSize", "skip", "top", "sortOptions", "textSearch"]);

    result.persistentObject = this.persistentObject.toServiceObject();
    if (this.columns != null)
        result.columns = this.columns.select(function (c) { return c.toServiceObject(); });

    return result;
};

Query.prototype.updateActions = function (selectedItems) {
    /// <summary>Enables or disables the canExecute of all the actions on the Query.</summary>

    var length = selectedItems == null ? 0 : selectedItems.length;
    this.actions.run(function (a) { a.canExecute(a.selectionRule(length)); });
};

Query.prototype.updateColumns = function (columns) {
    if (columns != null && columns.length > 0) {
        var self = this;
        this.columns = columns.select(function (c) { return new QueryColumn(c, self); }).sort(function (c1, c2) { return c1.offset - c2.offset; });
    }
    else
        this.columns = [];
};

Query.prototype.updateSelectedItems = function (items) {
    /// <summary>Updates the query's internal selected items collection.</summary>
    /// <param name="items">The items to be selected.</param>

    var selectedItems = items || [];
    if (this.maxSelectedItems > 0 && items.length > this.maxSelectedItems) {
        var lastIndex = items.length;
        selectedItems = items.slice(lastIndex - this.maxSelectedItems, lastIndex);
    }
    this.items.selectedItems(selectedItems);
};

Query.prototype.updateTitle = function () {
    /// <summary>Update the title with the data of the Query.</summary>

    if (this.container == null)
        return;

    var objTitle = this.container.find(".resultTitle");
    if (objTitle.length > 0 && objTitle.dataContext() == this) {
        objTitle.empty();
        objTitle.append((this.hasSearched ? this.totalItems + " " : "") + (this.totalItems != 1 ? this.label : (this.persistentObject.label || this.persistentObject.type)));
    }
};