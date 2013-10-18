/// <reference path="/Scripts/jquery-2.0.0.min.js"/>
/// <reference path="../Common.js" />
/// <reference path="../Application.js"/>

function QueryFilterItem(item) {
    if (item == null) {
        this.columns = [];
        this.header = "";
        this.isDefault = false;
        this.autoOpen = true;
    }
    else {
        this.columns = item.columns;
        this.header = item.header;
        this.isDefault = item.isDefault;
        this.autoOpen = item.autoOpen;
    }

    var originalHeaderValue = this.header;
    this.originalHeader = function () {
        return originalHeaderValue;
    };
};

function QueryFilter(query) {
    this._container = null;
    this._isExpanded = true;
    this.filterColumns = [];
    this.query = query;
};

QueryFilter.prototype.openPopup = function (menu) {
    menu.empty();

    var newFilter = $.createElement("div").addClass("queryFilterMenuItem newFilter");
    newFilter.text(app.getTranslatedMessage("NewFilter"));
    menu.append(newFilter);

    var filters = this._loadFilters();
    var self = this;
    filters.forEach(function (f) {
        var filterContainer = $.createElement("div").addClass("queryFilterMenuItem");

        var filterName = $.createElement("div").addClass("filterName");
        filterName.text(f.header);
        filterContainer.append(filterName);

        var filterEdit = $.createElement("div").addClass("editFilter");
        filterContainer.append(filterEdit);

        var filterDelete = $.createElement("div").addClass("deleteFilter");
        filterContainer.append(filterDelete);
        filterDelete.on("click", function () {
            var confirm = $.createElement("div").append($.createElement("span").text(String.format(app.getTranslatedMessage("AskForDeleteFilter"), f.header)));
            var buttons = {};
            buttons[app.getTranslatedMessage("Delete")] = function () {
                self._deleteFilter(f);
                $(this).dialog("close");
            };
            buttons[app.getTranslatedMessage("Cancel")] = function () {
                $(this).dialog("close");
            };

            var dialog = confirm.dialog({
                resizable: false,
                height: 100,
                modal: true,
                autoOpen: false,
                buttons: buttons
            });

            $(".ui-dialog-titlebar").remove();
            dialog.dialog("open");
        });

        if (f.isDefault)
            filterName.addClass("isDefault");

        menu.append(filterContainer);

        var openFilter = function () {
            self.closeFilter(true);
            self._loadFilter(f);
            self.createFilter(self.query.filterTarget);

            self._refreshQueryFilterColumns();
        };

        filterName.on("click", openFilter);
        filterEdit.on("click", function () {
            openFilter();

            self._toggleExpanded(true);
        });
    });

    newFilter.on("click", function () {
        self.closeFilter();
        self.createFilter(self.query.filterTarget);
        self._toggleExpanded(true);
        self.query.textSearch = "";
        self._refreshQueryFilterColumns();
    });
};

QueryFilter.prototype.openDefaultFilter = function () {
    var defaultFilter = this._loadFilters().firstOrDefault(function (f) { return f.isDefault; });
    if (defaultFilter != null) {
        this._loadFilter(defaultFilter, true);
        this._updateQueryFilterColumns();
    }
};

QueryFilter.prototype.closeFilter = function (skipRefresh) {
    this._clearFilter(skipRefresh);

    if (this.query.filterTarget != null) {
        this.query.filterTarget.empty();
        this.query.filterTarget.removeClass("queryFilterOpen");
    }

    this.currentFilter = null;
    $(".search").removeClass("filtering");
    $(".search input").focus();
};

QueryFilter.prototype.createFilter = function (rootContainer) {
    var self = this;
    rootContainer.addClass("queryFilterOpen");

    $(".search").addClass("filtering");
    $(".search input").blur();
    $(".search input").val("");

    /// HEADER ///////////////////////////////////////////////////////
    rootContainer.append(
        "<div id='queryFilterHeader'> \
                <div id='title'></div> \
                <div id='filterName'></div> \
                <div id='buttons'> \
                    <button id='collapseFilter'></button> \
                    <button id='closeFilter'></button> \
                </div> \
            </div>");
    rootContainer.find("#title").text(app.getTranslatedMessage("DataFilterControlHeader"));
    rootContainer.find("#filterName").text(this.currentFilter != null ? this.currentFilter.header : app.getTranslatedMessage("NewFilter"));
    rootContainer.find("#collapseFilter").on("click", function () {
        self._toggleExpanded();
    });
    rootContainer.find("#closeFilter").on("click", function () {
        self.closeFilter();
    });
    //////////////////////////////////////////////////////////////////

    /// CONTENT //////////////////////////////////////////////////////
    this._container = $.createElement("div").addClass("queryFilterContent");
    rootContainer.append(this._container);
    //////////////////////////////////////////////////////////////////

    /// ACTIONS //////////////////////////////////////////////////////
    var actionsContainer = $.createElement("div").addClass("queryFilterActionsContainer");
    rootContainer.append(actionsContainer);

    var actions = $.createElement("div").addClass("queryFilterActions");
    actionsContainer.append(actions);

    var saveForLater = $.createElement("button").addClass("saveForLater");
    saveForLater.text(app.getTranslatedMessage("SaveForLater"));
    saveForLater.button();
    actions.append(saveForLater);

    saveForLater.on("click", function () {
        var saveDiv = $.createElement("div").addClass("saveFilter");

        var row1 = $.createElement("div").addClass("row");
        saveDiv.append(row1);

        row1.append($.createElement("label").addClass("saveFilterLabel").text(app.getTranslatedMessage("FilterName")));
        var filterName = $.createInput("text");
        row1.append(filterName);

        var row2 = $.createElement("div").addClass("row");
        saveDiv.append(row2);

        row2.append($.createElement("label").addClass("saveFilterLabel").text(app.getTranslatedMessage("IsDefaultFilter")));
        var isDefault = $("<div id='isDefaultFilter'><input type='radio' id='isDefaultFilterYes' name='isDefaultFilter' /><label for='isDefaultFilterYes'>Yes</label><input type='radio' id='isDefaultFilterNo' name='isDefaultFilter' checked='checked' /><label for='isDefaultFilterNo'>No</label></div>");
        row2.append(isDefault);

        var row3 = $.createElement("div").addClass("row");
        saveDiv.append(row3);

        row3.append($.createElement("label").addClass("saveFilterLabel").text(app.getTranslatedMessage("AutoOpenFilter")));
        var autoOpenFilter = $("<div id='autoOpenFilter'><input type='radio' id='autoOpenFilterYes' name='autoOpenFilter' checked='checked' /><label for='autoOpenFilterYes'>Yes</label><input type='radio' id='autoOpenFilterNo' name='autoOpenFilter' /><label for='autoOpenFilterNo'>No</label></div>");
        row3.append(autoOpenFilter);

        if (self.currentFilter != null) {
            filterName.val(self.currentFilter.header);
            saveDiv.find("#isDefaultFilterYes").prop("checked", self.currentFilter.isDefault);
            saveDiv.find("#isDefaultFilterNo").prop("checked", !self.currentFilter.isDefault);
            saveDiv.find("#autoOpenFilterYes").prop("checked", self.currentFilter.autoOpen);
            saveDiv.find("#autoOpenFilterNo").prop("checked", !self.currentFilter.autoOpen);
        }

        isDefault.buttonset();
        autoOpenFilter.buttonset();

        var dialog = saveDiv.dialog({
            draggable: !$.mobile,
            width: 350,
            height: 190,
            modal: true,
            close: function () {
                dialog.remove();
                saveDiv.remove();
            },
            resizable: false,
            autoOpen: false,
            buttons: [
                    {
                        text: app.getTranslatedMessage("Save"),
                        click: function () {
                            if (!isNullOrWhiteSpace(filterName.val())) {
                                self._saveCurrentFilter(filterName.val(), saveDiv.find("#isDefaultFilterYes").prop("checked"), saveDiv.find("#autoOpenFilterYes").prop("checked"));
                                $(this).dialog("close");
                            }
                        }
                    },
                    {
                        text: app.getTranslatedMessage("DontSave"),
                        click: function () { $(this).dialog("close"); }
                    }],
            title: !isNullOrWhiteSpace(self.query.label) ? self.query.label : self.query.name
        });

        $(".ui-dialog-titlebar").remove();
        saveDiv.dialog("open");
    });

    var clear = $.createElement("button").addClass("clear");
    clear.text(app.getTranslatedMessage("ClearFilter"));
    clear.button();
    clear.on("click", function () {
        self._clearFilter();
        self._updatePicker();
    });
    actions.append(clear);

    actionsContainer.append($.createElement("div").addClass("clearFloat"));

    //////////////////////////////////////////////////////////////////

    if (this.query.filter.currentFilter != null)
        this._toggleExpanded(this.query.filter.currentFilter.autoOpen);

    if (this.filterColumns.length > 0) {
        this.filterColumns.forEach(function (c) {
            self._addFilterColumn(c);
        });

        rootContainer.find(".queryFilterColumn:first-child").find("input").focus();

        self._updateQueryFilterColumns(true);
    }

    this._createPicker();
};


QueryFilter.prototype._toggleExpanded = function (expanded) {
    if (expanded == null)
        expanded = !this._isExpanded;

    this._isExpanded = expanded;
    var rootContainer = $(".queryFilter");
    if (expanded)
        rootContainer.removeClass("collapsed");
    else
        rootContainer.addClass("collapsed");
};

QueryFilter.prototype._loadFilter = function (filter, skipReset) {
    var self = this;
    filter.columns.forEach(function (c) {
        var column = self.query.getColumn(c.name);
        if (column != null) {
            column.includes = c.includes;
            column.excludes = c.excludes;

            if (column.excludes != null && column.excludes.length > 0)
                column.isNegated = true;
        }

        self.filterColumns.push(c.name);
    });

    this.isVisible = filter.autoOpen;
    this.currentFilter = filter;

    if (!skipReset) {
        this.query.updateItems([], true);
        this.query.textSearch = null;
    }
};

QueryFilter.prototype._clearFilter = function (skipRefresh) {
    if (this._container != null)
        this._container.find(".queryFilterColumn").remove();

    var self = this;
    this.filterColumns.forEach(function (columnName) {
        var column = self.query.getColumn(columnName);
        column.includes = [];
        column.excludes = [];
        column.isNegated = false;
    });

    this.filterColumns = [];

    if (!skipRefresh)
        this._refreshQueryFilterColumns();
};

QueryFilter.prototype._deleteFilter = function (filter) {
    this._saveFilters(this._loadFilters().filter(function (f) { return f.header != filter.header; }));
};

QueryFilter.prototype._loadFilters = function () {
    var currentFilters = app.userSettings["Filters_" + this.query.id];
    if (currentFilters == null)
        currentFilters = [];
    else {
        currentFilters = JSON.parse(currentFilters).map(function (f) {
            return new QueryFilterItem(f);
        });
    }

    return currentFilters;
};

QueryFilter.prototype._saveCurrentFilter = function (name, isDefault, autoOpen) {
    var newItem = new QueryFilterItem();
    newItem.header = name;
    newItem.isDefault = isDefault;
    newItem.autoOpen = autoOpen;

    var self = this;
    this.filterColumns.forEach(function (columnName) {
        var column = self.query.getColumn(columnName);
        if (column != null) {
            newItem.columns.push({
                name: column.name,
                includes: column.includes,
                excludes: column.excludes
            });
        }
    });

    var filters = this._loadFilters();
    filters = filters.filter(function (f) { return f.header != newItem.header && (self.currentFilter == null || self.currentFilter.originalHeader() != f.header); });
    if (newItem.isDefault)
        filters.forEach(function (f) { f.isDefault = false; });

    filters.push(newItem);
    this._saveFilters(filters);

    this.currentFilter = newItem;
    this.query.filterTarget.find("#filterName").text(newItem.header);
};

QueryFilter.prototype._saveFilters = function (filters) {
    app.userSettings["Filters_" + this.query.id] = JSON.stringify(filters);
    app.saveUserSettings();
};

QueryFilter.prototype._addFilterColumn = function (columnName) {
    var column = this.query.getColumn(columnName);
    if (column == null)
        return;

    var filterColumn = $.createElement("div", columnName).addClass("queryFilterColumn").attr("id", columnName.replace(/\./g, "_"));
    filterColumn.append($.createElement("label").text(column.label));

    var text = $.createInput("text");
    var self = this;
    text.on("keypress", function (e) {
        if ((e.keyCode || e.which) == 13) {
            self._includeDistinct(self.query.getColumn(columnName), "1|@" + text.val());
            text.val("");
            e.stopPropagation();
            e.preventDefault();
        }
    });
    filterColumn.append(text);

    var distinctsContainer = $.createElement("div").addClass("queryFilterDistinctsContainer");
    filterColumn.append(distinctsContainer);


    /// NOT ///////////////////////////////////////////////////////
    var notBox = $.createElement("div").addClass("notBox");
    notBox.text(app.getTranslatedMessage("Not"));

    if (column.isNegated)
        filterColumn.addClass("negated");

    notBox.on("click", function () {
        var c = self.query.getColumn(columnName);
        c.isNegated = !c.isNegated;

        if (c.invertIncludesAndExcludes())
            self._refreshQueryFilterColumns();

        if (c.isNegated)
            filterColumn.addClass("negated");
        else
            filterColumn.removeClass("negated");
    });
    filterColumn.append(notBox);
    ////////////////////////////////////////////////////////////

    /// REMOVE //////////////////////////////////////////////////
    var removeButton = $.createElement("div").addClass("remove");
    removeButton.on("click", function () {
        filterColumn.remove();
        self._updatePicker();

        self.filterColumns.remove(columnName);
        var c = self.query.getColumn(columnName);
        c.includes = [];
        c.excludes = [];
        c.isNegated = false;

        self._refreshQueryFilterColumns();
    });
    filterColumn.append(removeButton);
    ////////////////////////////////////////////////////////////

    this._container.append(filterColumn);
    text.focus();
};

QueryFilter.prototype._renderColumnDistincts = function (columnName, column) {
    if (this._container == null)
        return;

    if (column == null)
        column = this.query.getColumn(columnName);

    if (column == null)
        return;

    var distinctsContainer = this._container.find("#" + column.name.replace(/\./g, "_") + " .queryFilterDistinctsContainer");
    distinctsContainer.empty();

    var self = this;
    if (column.includes != null) {
        column.includes.forEach(function (inc) {
            var incDiv = $.createElement("div").addClass("includeDistinct");
            incDiv.text(self._getRealDistinctValue(inc));
            distinctsContainer.append(incDiv);
            incDiv.on("click", function () { self._removeDistinct(column.includes, inc); });
        });
    }

    if (column.excludes != null) {
        column.excludes.forEach(function (inc) {
            var exclDiv = $.createElement("div").addClass("excludeDistinct");
            exclDiv.text(self._getRealDistinctValue(inc));
            distinctsContainer.append(exclDiv);
            exclDiv.on("click", function () { self._removeDistinct(column.excludes, inc); });
        });
    }

    column.matchingDistincts.forEach(function (md) {
        var mdDiv = $.createElement("div");
        mdDiv.text(self._getRealDistinctValue(md));
        distinctsContainer.append(mdDiv);
        mdDiv.on("click", function () { self._includeDistinct(column, md); });
    });

    column.remainingDistincts.forEach(function (rd) {
        var rdDiv = $.createElement("div").addClass("remainingDistinct");
        rdDiv.text(self._getRealDistinctValue(rd));
        distinctsContainer.append(rdDiv);
        rdDiv.on("click", function () { self._includeDistinct(column, rd); });
    });
};

QueryFilter.prototype._updateQueryFilterColumns = function (skipRefreshColumn) {
    var self = this;
    this.filterColumns.forEach(function (columnName) {
        if (!skipRefreshColumn) {
            var parameters = [{ ColumnName: columnName }];
            app.gateway.executeAction("QueryFilter.RefreshColumn", self.query.parent, self.query, null, parameters, function (result) {
                var column = self.query.getColumn(columnName);

                column.matchingDistincts = result.getAttribute("MatchingDistincts").options;
                column.remainingDistincts = result.getAttribute("RemainingDistincts").options;

                self._renderColumnDistincts(columnName, column);
            });
        }
        else
            self._renderColumnDistincts(columnName);
    });
};

QueryFilter.prototype._includeDistinct = function (column, distinct) {
    var arr = column.isNegated ? column.excludes : column.includes;
    arr.push(distinct);
    this._refreshQueryFilterColumns();
};

QueryFilter.prototype._removeDistinct = function (distinctsArray, distinct) {
    distinctsArray.remove(distinct);
    this._refreshQueryFilterColumns();
};

QueryFilter.prototype._refreshQueryFilterColumns = function () {
    var self = this;
    this.query.skip = 0;
    this.query.search(function () {
        self._updateQueryFilterColumns();
    }, function () {
        self.filterColumns.forEach(function (columnName) {
            self._renderColumnDistincts(columnName);
        });
    });
};

QueryFilter.prototype._getRealDistinctValue = function (value) {
    if (!isNullOrWhiteSpace(value) && value != "|") {
        var indexOfPipe = value.indexOf("|");

        if (indexOfPipe == 0)
            return value.substr(1);

        if (indexOfPipe > 0)
            return value.substr(indexOfPipe + parseInt(value.substr(0, indexOfPipe), 10) + 1);
    }

    return value == null ? app.getTranslatedMessage("DistinctNullValue") : app.getTranslatedMessage("DistinctEmptyValue");
};

QueryFilter.prototype._createPicker = function () {
    var picker = $.createElement("div").addClass("picker");
    var columnSelector = $.createElement("select");

    var self = this;
    columnSelector.on("change", function (c) {
        var column = self.query.getColumn(c.target.value);
        if (column != null) {
            picker.remove();

            self._addFilterColumn(column.name);
            self.filterColumns.push(column.name);

            self._createPicker();
            self._updateQueryFilterColumns();
        }
    });

    picker.append(columnSelector);
    this._container.append(picker);

    this._updatePicker();
};

QueryFilter.prototype._updatePicker = function () {
    var select = this._container.find(".picker").find("select");
    select.html($.createElement("option").text(""));

    var addedFilterColumns = this._container.find(".queryFilterColumn");
    this.query.columns.filter(function (c) { return c.disableSort != true && c.canFilter; }).forEach(function (c) {
        var alreadyAdded = addedFilterColumns.firstOrDefault(function (addedCol) { return c.name == $(addedCol).dataContext(); });
        if (alreadyAdded != null)
            return;

        var columnOption = $.createElement("option");
        columnOption.text(c.label);
        columnOption.val(c.name);
        select.append(columnOption);
    });
};