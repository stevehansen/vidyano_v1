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
/// <reference path="~/Scripts/jquery-2.0.0.min.js" />

function Query(query, parent, asLookup, isCloning) {
    /// <summary>Describes a Query that gives access to a collection of Persistent Objects.</summary>

    /// <field name="id" type="String">The unique identifier of this Query's definition.</field>
    this.id = query.id;
    this.isSystem = !!query.isSystem;
    /// <field name="name" type="String">The name of this Query.</field>
    this.name = query.name;
    /// <field name="label" type="String">The translated label of this Query.</field>
    this.label = query.label;
    this.singularLabel = null;
    /// <field name="parent" type="PersistentObject">The optional parent of this Query.</field>
    this.parent = parent;
    /// <field name="pageSize" type="Number">The number of items that should be queried per page (or null to use the application defaults).</field>
    this.pageSize = query.pageSize;
    /// <field name="canRead" type="Boolean">Indicates whether items on this Query can be opened (i.e.: if the current user has Read rights).</field>
    this.canRead = !!query.canRead;
    /// <field name="autoQuery" type="Boolean">Indicates whether the Query should be queried when opened.</field>
    this.autoQuery = !!query.autoQuery;
    this.isHidden = !!query.isHidden;
    this.offset = query.offset || 0;
    this.notification = query.notification;
    this.notificationType = query.notificationType;
    /// <field name="totalItems" type="Number">The total number of items for this Query.</field>
    this.totalItems = query.totalItems;
    this.filterDisplayName = query.filterDisplayName;
    /// <field name="persistentObject" type="PersistentObject">The Persistent Object that is used for the items on this Query.</field>
    this.persistentObject = query.persistentObject instanceof PersistentObject ? query.persistentObject : new PersistentObject(query.persistentObject);
    /// <field name="sortOptions" type="String">The sort options that should be used for the Query.</field>
    this.sortOptions = query.sortOptions || "";
    /// <field name="actionNames" type="Array" elementType="String">Contains the names of the actions that were allowed for this instance.</field>
    this.actionNames = query.actionNames || query.actions;
    /// <field name="actions" type="Array" elementType="ActionBase">Contains the actions for this instance.</field>
    this.actions = Actions.getActions(this.actionNames, this);
    /// <field name="columns" type="Array" elementType="QueryColumn">Contains the columns for this instance.</field>
    this._columnsByName = {};
    this.columns = query.columns ? query.columns.map(function (c) { return new QueryColumn(c, this); }, this).sort(function (c1, c2) { return c1.offset - c2.offset; }) : [];
    this.skip = query.skip;
    this.top = query.top;
    this.itemPanelTemplateKey = query.itemPanelTemplateKey;
    this.itemTemplateKey = query.itemTemplateKey;
    this.textSearch = query.textSearch;

    /// <field name="canSearch" type="Boolean">Indicates whether the Search method can be used at the moment, is disabled during searches.</field>
    this.canSearch = true;
    this.isReference = false;
    this.container = null;
    this.target = null;
    this.filterTarget = null;
    this.spinnerTarget = null;
    this.notificationTarget = null;
    this.titleTarget = null;
    this._persistentObjectSelectedNavigationTabElement = null;
    /// <field name="options">Contains the options that can be set for this Query.</field>
    this.options = {
        hideSemanticZoom: true,
        hideManagement: false,
        hideSelector: !this.actions.some(function (a) { return a.isVisible() && a.hasSelectionRule; }),
        hideInlineActions: false,
        allowSelectAll: this.isSystem,
    };
    this.queriedPages = [];
    /// <field name="hasSearched" type="Boolean">Indicates whether the Search has been called at least once.</field>
    this.hasSearched = false;
    /// <field name="items" type="Array" elementType="QueryResultItem">Contains the items for this instance.</field>
    this.items = null;
    this.allSelected = false;
    this.updateItems([], true);
    this.totalItem = null;
    this.hasTotalItem = false;
    this.semanticZoomOwner = null;

    this.result = query.result;
    if (this.result != null)
        this.setResult(this.result);

    /// <field name="filter" type="QueryFilter">The filter used for this Query.</field>
    this.filter = new QueryFilter(this);
    if (!$.mobile && !isCloning && !asLookup && this.actionNames != null && this.actionNames.contains("Filter"))
        this.filter.openDefaultFilter();

    // Exception for MemberOf
    if (this.isSystem && (this.id == "b4e1ed7d-a8c8-4193-b24a-df2e9d6c643a" || this.id == "b9632a39-2625-44b0-8828-757e04cf396d"))
        this.singularLabel = this.label;

    app._onConstructQuery(this);
}

Query.prototype.clone = function (isReference) {
    /// <summary>Creates a clone of this instance.</summary>
    /// <param name="isReference">specifies if the close is for a Persistent Object Attribute or a Persistent Object Attribute with Reference.</param>
    /// <returns type="Query" />

    var clone = new Query(this, this.parent, isReference, true);
    clone.isReference = isReference || false;
    return clone;
};

Query.prototype.getAction = PersistentObject.prototype.getAction;

Query.prototype.getColumn = function (name) {
    /// <summary>Gets the column by name.</summary>
    /// <param name="name">the name of the column.</param>
    /// <returns type="QueryColumn" />

    return this._columnsByName[name];
};

Query.prototype.getItems = function (start, length, onComplete, onError) {
    /// <summary>Gets the items from the Query within the specified range from the service.</summary>
    /// <param name="start" type="Number">The index of the first item to get.</param>
    /// <param name="length" type="Number">The number of items to get</param>
    /// <param name="onComplete" type="Function">The function to call when the requested items are fetched from the service.</param>
    /// <param name="onError" type="Function">The function to call when an error occured.</param>

    var self = this;
    if (!this.hasSearched) {
        // NOTE: Don't know totalItems yet, call normal search first
        this.search(function () {
            self.getItems(start, length, onComplete, onError);
        }, onError);
        return;
    }

    if (this.totalItems >= 0) {
        if (start > this.totalItems)
            start = this.totalItems;

        if (start + length > this.totalItems)
            length = this.totalItems - start;
    }

    if (this.pageSize <= 0 || length == 0) {
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

    clonedQuery.search(function (result) {
        var isChanged = self.isChanged(result);
        if (isChanged) {
            // NOTE: Query has changed (items added/deleted) so remove old data
            self.queriedPages.clear();
            for (var i = startPage; i <= endPage; i++)
                self.queriedPages.push(i);

            self.items.clear();
            self.items.selectedItems([]);

            self.totalItems = result.totalItems;
            self.updateTitle();
        }

        for (var n = 0; n < clonedQuery.top && (clonedQuery.skip + n < clonedQuery.totalItems) ; n++) {
            if (self.items[clonedQuery.skip + n] == null)
                self.items[clonedQuery.skip + n] = new QueryResultItem(result.items[n], self);
        }

        if (isChanged)
            self.getItems(start, length, onComplete, onError);
        else
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

Query.prototype.getTitle = function () {
    return (this.totalItems != null ? this.totalItems + " " : "") + (this.totalItems != 1 ? this.label : (this.singularLabel || this.persistentObject.label || this.persistentObject.type));
};

Query.prototype.hasItems = function () {
    /// <summary>Checkes if the Query has any Items.</summary>
    /// <returns type="Boolean" />

    return this.items != null && this.items.length > 0;
};

Query.prototype.hasSelection = function () {
    /// <summary>Checkes if the Query has any selected items.</summary>
    /// <returns type="Boolean" />

    return this.allSelected || (this.items != null && this.items.selectedItems() != null && this.items.selectedItems().length > 0);
};

Query.prototype.hasVisibleActions = function () {
    /// <summary>Returns a value indicating if the Query should have any visible actions.</summary>
    /// <returns type="Boolean" />

    return this.actions.filter(function (a) { return a.name != "Filter" && a.name != "RefreshQuery" && a.isVisible(); }).length > 0;
};

Query.prototype.isChanged = function (result) {
    /// <summary>Returns a value indicating if the Query has changed since the last result so that any existing items are invalid.</summary>
    /// <param name="result">The Query instance received from the service, used to update the values of the Query.</param>
    /// <returns type="Boolean" />

    return this.pageSize > 0 && this.totalItems != result.totalItems;
};

Query.prototype.onItemClicked = function (selectedItem, selectedColumn) {
    /// <summary>Is called when an item is clicked in a Query.</summary>
    /// <param name="selectedItem" type="QueryResultItem">The item that was clicked on.</param>
    /// <param name="selectedColumn" type="QueryColumn" optional="true">The column that was clicked on, or null if the items was clicked from somewhere else.</param>

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

        this.container = $("<div id='content'></div>");
        $("#content").replaceWith(this.container);
        this.container.html($($.mobile ? "#query_mobile_template" : "#query_template").html());
        $.unhookElements();

        this.container.dataContext(this);
        var containerContent = this.container.find(".resultContent");
        containerContent.addClass("-vi-" + this.persistentObject.type);
        containerContent.queryViewer(this);
        this.container.actionBarExpander();

        this.titleTarget = this.container.find(".resultTitle");
    }
    else {
        this.container.dataContext(this);
        this.container.queryViewer(this);
    }

    this.showNotification(this.notification, this.notificationType);
    this.updateTitle();

    var resultPanel = (persistentObjectContainer != null ? persistentObjectContainer : this.container).find(".resultPanel");

    persistentObjectActionsContainer = persistentObjectActionsContainer == null ? this.container.find(".resultActions") : persistentObjectActionsContainer;
    if (this.hasVisibleActions()) {

        resultPanel.removeClass("noQueryActions");
        Actions.showActions(this.actions.filter(function (a) { return a.name != "Filter"; }), persistentObjectActionsContainer);
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
    if (code != null && typeof (code.postRender) == "function")
        code.postRender(this.container, this);

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
                if (q.spinnerTarget != null)
                    q.spinnerTarget.spin(false);

                if (oldOnCompleted != null)
                    oldOnCompleted(result);
            };
            onError = function (e) {
                if (q.spinnerTarget != null)
                    q.spinnerTarget.spin(false);

                if (oldOnError != null)
                    oldOnError(e);
            };
        }

        this.queriedPages = [];
        this.updateItems([], true);

        if (this.target != null)
            this.target.trigger("itemsChanged", [this]);

        app.gateway.executeQuery(this.parent, this, this.filterDisplayName, this.isReference, onCompleted, onError);
    }
};

Query.prototype.selectAll = function () {
    /// <summary>Selects all the items in the Query. Can only be used if options.allowSelectAll is true. WARNING: Not recommended on big (1000+) queries.</summary>

    if (!this.options.allowSelectAll)
        return;

    if (this.hasSearched && this.pageSize <= 0) {
        var self = this;
        this.getItems(0, this.totalItems, function () { self.updateSelectedItems(self.items); });
    }
    else {
        // NOTE: Virtual selection
        this.allSelected = true;
        this.items._trigger("selectedItemsChanged", []);
    }
};

Query.prototype.selectNone = function () {
    /// <summary>Selects no items in the Query.</summary>

    this.allSelected = false;
    this.items.selectedItems([]);
};

Query.prototype.selectToggle = function () {
    /// <summary>Toggles the selection. Selects all items if nothing is selected, otherwise any selection is cleared.</summary>

    if (this.hasSelection())
        this.selectNone();
    else
        this.selectAll();
};

Query.prototype.semanticZoom = function () {
    var self = this;
    var parent = this.parent;
    app.gateway.executeAction("QueryFilter.SemanticZoom", parent, this, null, null, function (result) {
        if (result != null) {
            if (result.queries != null)
                result.queries.forEach(function (q) {
                    q.parent = parent;
                    q.semanticZoomOwner = self;
                });

            app.openPersistentObject(result, true);
        }
    });
};

Query.prototype.setResult = function (result) {
    /// <summary>Updates the Query with the values of the supplied query.</summary>
    /// <param name="result">The Query instance received from the service, used to update the values of the Query.</param>

    this.pageSize = result.pageSize || 0;

    if (this.pageSize > 0) {
        this.totalItems = result.totalItems || 0;
        this.queriedPages.push(Math.floor((this.skip || 0) / this.pageSize));
    }
    else
        this.totalItems = result.items.length;

    var q = this;
    var newItems = result.items.map(function (item) { return new QueryResultItem(item, q); });

    this.updateColumns(result.columns);

    this.updateItems(newItems);

    this.totalItem = result.totalItem != null ? new QueryResultItem(result.totalItem, this) : null;
    this.hasTotalItem = this.totalItem != null;

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
    /// <returns type="Object">Returns a copy of the Query that is optimized to send to the service.</returns>

    var result = copyProperties(this, ["id", "name", "label", "pageSize", "skip", "top", "sortOptions", "textSearch", "allSelected", "isSystem"]);

    result.persistentObject = this.persistentObject.toServiceObject();
    if (this.columns != null)
        result.columns = this.columns.map(function (c) { return c.toServiceObject(); });

    return result;
};

Query.prototype.toString = function () {
    return "Query " + this.name;
};

Query.prototype.updateActions = function (selectedItems) {
    /// <summary>Enables or disables the canExecute of all the actions on the Query.</summary>

    var length = this.allSelected ? this.totalItems : (selectedItems == null ? 0 : selectedItems.length);
    this.actions.forEach(function (a) { a.canExecute(a.selectionRule(length)); });
};

Query.prototype.updateColumns = function (columns) {
    if (columns != null && columns.length > 0) {
        var self = this;
        this.columns = this.columns.filter(function (c1) { return columns.firstOrDefault(function (c2) { return c1.name == c2.name; }) != null; });
        columns.filter(function (c1) { return self.columns.firstOrDefault(function (c2) { return c1.name == c2.name; }) == null; }).forEach(function (c) {
            self.columns.push(new QueryColumn(c, self));
        });
        this.columns = this.columns.sort(function (c1, c2) { return c1.offset - c2.offset; });
    }
    else
        this.columns = [];
};

Query.prototype.updateItems = function (items, reset) {
    this.items = items.toSelector();
    this.allSelected = false;
    this.updateActions([]);

    var self = this;
    this.items.onSelectedItemsChanged(function (selectedItems) {
        self.updateActions(selectedItems);

        if (self.target != null && self.target.length > 0)
            self.target.trigger("selectedItemsChanged", [self]);
    });

    if (reset)
        this.hasSearched = false;
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

    if (this.titleTarget != null && this.titleTarget.length > 0 && this.titleTarget.dataContext() == this)
        this.titleTarget.text(this.getTitle());
};