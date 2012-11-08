/// <reference path="/Scripts/jquery-1.8.1.min.js"/>
/// <reference path="../Common.js" />
/// <reference path="../Application.js"/>

function QueryFilterItem(item) {
    if (item == null) {
        this.columns = [];
        this.header = "";
        this.isDefault = false;
        this.autoOpen = true;
    }
    else if (item.Columns) {
        // Convert old casing
        this.columns = item.Columns.select(function (c) { return { id: c.Id, name: c.Name, includes: c.Includes, excludes: c.Excludes }; });
        this.header = item.Header;
        this.isDefault = item.IsDefault;
        this.autoOpen = item.AutoOpen;
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
    var me = this;
    var container;
    var isExpanded = true;
    me.filterColumns = [];

    this.openPopup = function (menu) {
        menu.empty();

        var newFilter = $.createElement("div").addClass("queryFilterMenuItem newFilter");
        newFilter.text(app.getTranslatedMessage("NewFilter"));
        menu.append(newFilter);

        var filters = methods.loadFilters();
        filters.run(function (f) {
            var filterContainer = $.createElement("div").addClass("queryFilterMenuItem");

            var filterDelete = $.createElement("div").addClass("deleteFilter");
            filterContainer.append(filterDelete);
            filterDelete.on("click", function () {
                var confirm = $.createElement("div").append($.createElement("span").text(String.format(app.getTranslatedMessage("AskForDeleteFilter"), f.header)));
                var buttons = {};
                buttons[app.getTranslatedMessage("Delete")] = function () {
                    methods.deleteFilter(f);
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

            var filterEdit = $.createElement("div").addClass("editFilter");
            filterContainer.append(filterEdit);

            var filterName = $.createElement("div").addClass("filterName");
            filterName.text(f.header);
            filterContainer.append(filterName);

            if (f.isDefault)
                filterName.addClass("isDefault");

            filterContainer.append($.createElement("div").addClass("clearFloat"));

            menu.append(filterContainer);

            var openFilter = function () {
                methods.clearFilter(true);

                me.closeFilter();
                methods.loadFilter(f);
                me.createFilter(query.filterTarget);

                methods.refreshQueryFilterColumns();
            };

            filterName.on("click", openFilter);
            filterEdit.on("click", function () {
                openFilter();
                methods.toggleExpanded(true);
            });
        });

        newFilter.on("click", function () {
            me.closeFilter();
            me.createFilter(query.filterTarget);
            methods.toggleExpanded(true);
            query.textSearch = "";
            methods.refreshQueryFilterColumns();
        });

        var doc = $("body");
        var closeMenu = function () {
            menu.hide();
            doc.off("click", closeMenu);
        };
        doc.on("click", closeMenu);

        menu.show();
    };

    this.openDefaultFilter = function () {
        var defaultFilter = methods.loadFilters().firstOrDefault(function (f) { return f.isDefault; });
        if (defaultFilter != null) {
            methods.loadFilter(defaultFilter);
            methods.updateQueryFilterColumns();
        }
    };

    this.closeFilter = function () {
        methods.clearFilter();
        if (query.filterTarget != null) {
            query.filterTarget.empty();
            query.filterTarget.removeClass("queryFilterOpen");
        }

        me.currentFilter = null;
        $(".search").removeClass("filtering");
        $(".search input").focus();
    };

    this.createFilter = function (rootContainer) {
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
        rootContainer.find("#filterName").text(me.currentFilter != null ? me.currentFilter.header : app.getTranslatedMessage("NewFilter"));
        rootContainer.find("#collapseFilter").on("click", function () {
            methods.toggleExpanded();
        });
        rootContainer.find("#closeFilter").on("click", function () {
            me.closeFilter();
        });
        //////////////////////////////////////////////////////////////////

        /// CONTENT //////////////////////////////////////////////////////
        container = $.createElement("div").addClass("queryFilterContent");
        rootContainer.append(container);
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

            if (me.currentFilter != null) {
                filterName.val(me.currentFilter.header);
                saveDiv.find("#isDefaultFilterYes").prop("checked", me.currentFilter.isDefault);
                saveDiv.find("#autoOpenFilterYes").prop("checked", me.currentFilter.autoOpen);
                saveDiv.find("#isDefaultFilterNo").prop("checked", !me.currentFilter.isDefault);
                saveDiv.find("#autoOpenFilterNo").prop("checked", !me.currentFilter.autoOpen);
            }

            isDefault.buttonset();
            autoOpenFilter.buttonset();

            var dialog = saveDiv.dialog({
                draggable: !$.browser.mobile,
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
                                    methods.saveCurrentFilter(filterName.val(), saveDiv.find("#isDefaultFilterYes").prop("checked"), saveDiv.find("#autoOpenFilterYes").prop("checked"));
                                    $(this).dialog("close");
                                }
                            }
                        },
                        {
                            text: app.getTranslatedMessage("DontSave"),
                            click: function () { $(this).dialog("close"); }
                        }],
                title: !isNullOrWhiteSpace(query.label) ? query.label : query.name
            });

            $(".ui-dialog-titlebar").remove();
            saveDiv.dialog("open");
        });

        var clear = $.createElement("button").addClass("clear");
        clear.text(app.getTranslatedMessage("ClearFilter"));
        clear.button();
        clear.on("click", function () {
            methods.clearFilter();
            methods.updatePicker();
        });
        actions.append(clear);

        actionsContainer.append($.createElement("div").addClass("clearFloat"));

        //////////////////////////////////////////////////////////////////

        if (query.filter.currentFilter != null) {
            methods.toggleExpanded(query.filter.currentFilter.autoOpen);
        }

        if (me.filterColumns.length > 0) {
            me.filterColumns.run(function (c) {
                methods.addFilterColumn(c);
            });

            rootContainer.find(".queryFilterColumn:first-child").find("input").focus();

            methods.updateQueryFilterColumns(true);
        }

        methods.createPicker();
    };

    var methods = {
        toggleExpanded: function (expanded) {
            if (expanded == null)
                expanded = !isExpanded;

            isExpanded = expanded;
            var rootContainer = $(".queryFilter");
            if (expanded) {
                rootContainer.find(".queryFilterContent").show();
                rootContainer.find(".queryFilterActionsContainer").show();
            }
            else {
                rootContainer.find(".queryFilterContent").hide();
                rootContainer.find(".queryFilterActionsContainer").hide();
            }
        },

        loadFilter: function (filter) {
            filter.columns.run(function (c) {
                var column = methods.getColumn(c.name);
                if (column != null) {
                    column.includes = c.includes;
                    column.excludes = c.excludes;

                    if (column.excludes != null && column.excludes.length > 0)
                        column.isNegated = true;

                }

                me.filterColumns.push(c.name);
            });

            me.isVisible = filter.autoOpen;
            me.currentFilter = filter;

            query.items = [];
            query.textSearch = null;
            query.hasSearched = false;
        },

        clearFilter: function (skipRefresh) {
            if (container != null) {
                container.find(".queryFilterColumn").each(function () {
                    $(this).remove();
                });
            }

            me.filterColumns.run(function (columnName) {
                var col = methods.getColumn(columnName);
                col.includes = [];
                col.excludes = [];
                col.isNegated = false;
            });

            me.filterColumns = [];

            if (!skipRefresh)
                methods.refreshQueryFilterColumns();
        },

        deleteFilter: function (filter) {
            var filters = methods.loadFilters();
            methods.saveFilters(filters.where(function (f) { return f.header != filter.header; }));
        },

        loadFilters: function () {
            var currentFilters = localStorage.getItem("Filters_" + query.id);
            if (currentFilters == null)
                currentFilters = [];
            else {
                currentFilters = JSON.parse(currentFilters).select(function (f) {
                    return new QueryFilterItem(f);
                });
            }

            return currentFilters;
        },

        saveCurrentFilter: function (name, isDefault, autoOpen) {
            var newItem = new QueryFilterItem();
            newItem.header = name;
            newItem.isDefault = isDefault;
            newItem.autoOpen = autoOpen;
            me.filterColumns.run(function (columnName) {
                var col = query.columns.firstOrDefault(function (c) { return c.name == columnName; });
                if (col != null) {
                    newItem.columns.push(
                                {
                                    id: col.id,
                                    name: col.name,
                                    includes: col.includes,
                                    excludes: col.excludes
                                });
                }
            });

            var filters = methods.loadFilters();
            filters = filters.where(function (f) { return f.header != newItem.header && (me.currentFilter == null || me.currentFilter.originalHeader() != f.header); });
            if (newItem.isDefault) {
                filters.run(function (f) { f.isDefault = false; });
            }

            filters.push(newItem);
            methods.saveFilters(filters);

            me.currentFilter = newItem;
            query.filterTarget.find("#filterName").text(newItem.header);
        },

        saveFilters: function (filters) {
            localStorage.setItem("Filters_" + query.id, JSON.stringify(filters));
        },

        getColumn: function (name) {
            return query.columns.firstOrDefault(function (c) { return c.name == name; });
        },

        addFilterColumn: function (columnName) {
            var column = methods.getColumn(columnName);
            if (column == null)
                return;

            var filterColumn = $.createElement("div", columnName).addClass("queryFilterColumn").attr("id", columnName);
            filterColumn.append($.createElement("label").text(column.label));

            var text = $.createInput("text");
            text.on("keypress", function (e) {
                if ((e.keyCode || e.which) == 13) {
                    methods.includeDistinct(methods.getColumn(columnName), "1|@" + text.val());
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

            if (column.isNegated) {
                filterColumn.addClass("negated");
            }

            notBox.on("click", function () {
                var c = methods.getColumn(columnName);
                c.isNegated = !c.isNegated;

                if (c.invertIncludesAndExcludes())
                    methods.refreshQueryFilterColumns();

                if (c.isNegated) {
                    filterColumn.addClass("negated");
                }
                else {
                    filterColumn.removeClass("negated");
                }
            });
            filterColumn.append(notBox);
            ////////////////////////////////////////////////////////////

            /// REMOVE //////////////////////////////////////////////////
            var removeButton = $.createElement("div").addClass("remove");
            removeButton.on("click", function () {
                filterColumn.remove();
                methods.updatePicker();

                me.filterColumns.remove(columnName);
                var c = methods.getColumn(columnName);
                c.includes = [];
                c.excludes = [];
                c.isNegated = false;

                methods.refreshQueryFilterColumns();
            });
            filterColumn.append(removeButton);
            ////////////////////////////////////////////////////////////

            container.append(filterColumn);
            text.focus();
        },

        renderColumnDistincts: function (columnName, col) {
            if (container == null)
                return;

            if (col == null)
                col = methods.getColumn(columnName);

            var distinctsContainer = container.find("#" + col.name + " .queryFilterDistinctsContainer");
            distinctsContainer.empty();

            if (col.includes != null) {
                col.includes.run(function (inc) {
                    var incDiv = $.createElement("div").addClass("includeDistinct");
                    incDiv.text(methods.getRealDistinctValue(inc));
                    distinctsContainer.append(incDiv);
                    incDiv.on("click", function () { methods.removeDistinct(col.includes, inc); });
                });
            }

            if (col.excludes != null) {
                col.excludes.run(function (inc) {
                    var incDiv = $.createElement("div").addClass("excludeDistinct");
                    incDiv.text(methods.getRealDistinctValue(inc));
                    distinctsContainer.append(incDiv);
                    incDiv.on("click", function () { methods.removeDistinct(col.excludes, inc); });
                });
            }

            col.matchingDistincts.run(function (md) {
                var mdDiv = $.createElement("div");
                mdDiv.text(methods.getRealDistinctValue(md));
                distinctsContainer.append(mdDiv);
                mdDiv.on("click", function () { methods.includeDistinct(col, md); });
            });

            col.remainingDistincts.run(function (rd) {
                var rdDiv = $.createElement("div").addClass("remainingDistinct");
                rdDiv.text(methods.getRealDistinctValue(rd));
                distinctsContainer.append(rdDiv);

                rdDiv.on("click", function () { methods.includeDistinct(col, rd); });
            });
        },

        updateQueryFilterColumns: function (skipRefreshColumn) {
            me.filterColumns.run(function (columnName) {
                if (!skipRefreshColumn) {
                    var parameters = [{ ColumnName: columnName}];
                    app.gateway.executeAction("QueryFilter.RefreshColumn", query.parent, query, null, parameters, function (result) {
                        var col = methods.getColumn(columnName);

                        col.matchingDistincts = result.getAttribute("MatchingDistincts").options;
                        col.remainingDistincts = result.getAttribute("RemainingDistincts").options;

                        methods.renderColumnDistincts(columnName, col);
                    });
                }
                else
                    methods.renderColumnDistincts(columnName);
            });
        },

        includeDistinct: function (column, distinct) {
            var arr = column.isNegated ? column.excludes : column.includes;
            arr.push(distinct);
            methods.refreshQueryFilterColumns();
        },

        removeDistinct: function (distinctsArray, distinct) {
            distinctsArray.remove(distinct);
            methods.refreshQueryFilterColumns();
        },

        refreshQueryFilterColumns: function () {
            query.skip = 0;
            query.search(function () {
                methods.updateQueryFilterColumns();
            });
        },

        getRealDistinctValue: function (value) {
            if (!isNullOrWhiteSpace(value) && value != "|") {
                var indexOfPipe = value.indexOf("|");

                if (indexOfPipe == 0)
                    return value.substr(1);

                if (indexOfPipe > 0)
                    return value.substr(indexOfPipe + parseInt(value.substr(0, indexOfPipe), 10) + 1);
            }

            return value == null ? app.getTranslatedMessage("DistinctNullValue") : app.getTranslatedMessage("DistinctEmptyValue");
        },

        createPicker: function () {
            var picker = $.createElement("div").addClass("picker");
            var columnSelector = $.createElement("select");

            columnSelector.on("change", function (c) {
                var column = query.columns.firstOrDefault(function (col) { return c.target.value == col.name; });
                if (column != null) {
                    picker.remove();

                    methods.addFilterColumn(column.name);
                    me.filterColumns.push(column.name);

                    methods.createPicker();
                    methods.updateQueryFilterColumns();
                }
            });

            picker.append(columnSelector);
            container.append(picker);

            methods.updatePicker();
        },

        updatePicker: function () {
            var select = container.find(".picker").find("select");
            select.html($.createElement("option").text(""));

            var addedFilterColumns = container.find(".queryFilterColumn");
            query.columns.where(function (c) { return c.disableSort != true && c.canFilter; }).run(function (c) {
                var alreadyAdded = addedFilterColumns.firstOrDefault(function (addedCol) { return c.name == $(addedCol).dataContext(); });
                if (alreadyAdded != null)
                    return;

                var columnOption = $.createElement("option");
                columnOption.text(c.label);
                columnOption.attr("value", c.name);
                select.append(columnOption);
            });
        }
    };
};