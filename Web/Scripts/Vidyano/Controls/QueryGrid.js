(function ($, undefined) {
    "use strict";

    var ie8 = !$.support.leadingWhitespace; // IE8 and lower
    $.queryGridData = [];
    $.queryGridHoverStyle = $.rule(".queryGrid tr.hover").text();

    $(function () {
        var inner = document.createElement('p');
        inner.style.width = "100%";
        inner.style.height = "200px";

        var outer = document.createElement('div');
        outer.style.position = "absolute";
        outer.style.top = "0px";
        outer.style.left = "0px";
        outer.style.visibility = "hidden";
        outer.style.width = "200px";
        outer.style.height = "150px";
        outer.style.overflow = "hidden";
        outer.appendChild(inner);

        document.body.appendChild(outer);
        var w1 = inner.offsetWidth;
        outer.style.overflow = 'scroll';
        var w2 = inner.offsetWidth;
        if (w1 == w2) w2 = outer.clientWidth;

        document.body.removeChild(outer);
        $.scrollbarWidth = (w1 - w2);
    });

    $.fn.queryGrid = function (q, options) {
        var query = q;
        var unPinnedColumns = [];
        var pinnedColumns = [];
        var getItemsThrottled = _.debounce(function (s, length, onComplete, onError) { query.getItems(s, length, onComplete, onError); }, 250);
        var rootContainer = this;
        var container = null;
        var header, headerSelector, headerColumnsClippingContainer, pinnedHeaderColumnsContainer, headerColumnsContainer, viewport, viewportWidth, scroller, dataTable, dataTableContainer, pinnedDataTableContainer, pinnedDataTable, dataSelector, remainderTable;
        var rows = [];
        var rowCount;
        var data = {};
        var start = 0, max = 0;
        var currentRowHoverIdx = -1;
        var remainderRule;
        var columnCount;
        var lastSelectedIndex;
        var selectedColumn;
        var pinnedWidth, dataSelectorWidth, viewportOffset, viewportScrollLeft;
        
        var methods = {
            refresh: function (e, q) {
                if (q != query)
                    return;

                if (container.length == 0 || container.dataContext() != query) {
                    rootContainer.unbind("itemsChanged");
                    rootContainer.unbind("selectedItemsChanged");
                    return;
                }

                rootContainer.unbind("itemsChanged");
                rootContainer.bind("itemsChanged", methods.refresh);
                rootContainer.unbind("selectedItemsChanged");
                rootContainer.bind("selectedItemsChanged", methods.updateSelectedRowRules);

                if (columnCount != methods.getColumns().length)
                    methods.create();
                else {
                    methods.createDataRows();
                    if (viewport.scrollTop() != 0)
                        viewport.scrollTop(0);
                    else
                        methods.syncData(0, true);
                }
            },

            create: function () {
                columnCount = methods.getColumns().length;

                rootContainer.unbind("itemsChanged");
                rootContainer.bind("itemsChanged", methods.refresh);
                rootContainer.unbind("selectedItemsChanged");
                rootContainer.bind("selectedItemsChanged", methods.updateSelectedRowRules);

                methods.loadSettingsFromLocalStorage();

                unPinnedColumns = methods.getColumns().where(function (c) { return c.isPinned != true; });
                pinnedColumns = methods.getColumns().where(function (c) { return c.isPinned == true; });

                data = { id: ".queryGrid" + $.queryGridData.length, rules: [], columnRules: null, extraClasses: [] };
                data.rules.push(methods.addCssRule(data.id + " .contentHolder { height: " + options.rowHeight + "px; line-height: " + options.rowHeight + "px; white-space: nowrap; overflow: hidden; }"));

                if (container != null)
                    container.remove();

                container = $("<div>").css({ "width": "100%", "height": "100%", "box-sizing": "border-box", "position": "relative" });
                rootContainer.append(container);

                // Remove previously unique querygrid id's
                var containerClass = container.attr('class') || "";
                $.each(containerClass.split(/\s+/), function (index, item) {
                    if (item.startsWith("queryGrid"))
                        container.removeClass(item);
                });
                // Cleanup all orphan styles
                var dataObjects = $.queryGridData.slice(0);
                for (var i = 0; i < dataObjects.length; i++) {
                    var obj = dataObjects[i];
                    if ($(obj.id).length == 0) {
                        $.queryGridData.splice(i, 1);
                        obj.rules.run(function (r) { r.remove(); });
                        for (var cr in obj.columnRules) { obj.columnRules[cr].rule.remove(); }
                    }
                }
                // Add a unique querygrid id for this container
                container.addClass(data.id.substring(1) + " queryGrid");
                $.queryGridData.push(data);
                ////////////////////////////////////////////////

                header = $("<div>").addClass("header").css({
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    overflow: "hidden",
                    "white-space": "nowrap"
                });
                container.append(header);
                var headerHeight = header.outerHeight(true);

                headerSelector = $("<div>").addClass("headerSelector").append($("<div>"));
                header.append(headerSelector);

                pinnedHeaderColumnsContainer = $("<div>").addClass("pinnedHeaderColumnsContainer").css({ display: "inline-block", overflow: "hidden" });
                header.append(pinnedHeaderColumnsContainer);

                headerColumnsClippingContainer = $("<div>").addClass("headerColumnsClippingContainer").css({ display: "inline-block", overflow: "hidden" });
                headerColumnsContainer = $("<div>").addClass("headerColumnsContainer").css({ width: "50000px" });
                headerColumnsClippingContainer.append(headerColumnsContainer);
                header.append(headerColumnsClippingContainer);

                var managementButtonContainer = $("<div>").addClass("managementButtonContainer");
                header.append(managementButtonContainer);
                var managementButton = $("<div>").addClass("managementButton");
                if (!query.isSystem && (query.parent == null || query.parent.type != "SemanticZoom")) {
                    var semanticZoomButton = $("<div>").addClass("semanticZoomButton");
                    managementButtonContainer.append(semanticZoomButton);
                    semanticZoomButton.on("click", function () { query.semanticZoom(); });
                } else
                    managementButtonContainer.css({ width: "24px" });
                managementButtonContainer.append(managementButton);
                managementButton.on("click", methods.toggleManagement);

                viewport = $("<div>").addClass("viewport").css({
                    overflow: "auto",
                    position: "absolute",
                    top: headerHeight + "px",
                    left: "0",
                    bottom: "0", //(query.hasTotalItem ? options.rowHeight : 0) + "px",
                    right: "0",
                    width: "100%"
                });

                viewport.bind("resize", function () {
                    methods.createDataRows();

                    remainderRule.css("width", viewport.outerWidth(true) + "px");
                    if (ie8)
                        remainderTable.width(viewport.outerWidth(true));
                    methods.invalidateDataTablePosition();

                    pinnedWidth = pinnedDataTableContainer.outerWidth(true);
                    dataSelectorWidth = dataSelector.outerWidth(true);
                    viewportOffset = viewport.offset();
                });
                viewport.bind("scroll", function (e) {
                    if (query.queryGridSettings.scrollLeft != e.currentTarget.scrollLeft) {
                        query.queryGridSettings.scrollLeft = e.currentTarget.scrollLeft;
                    }

                    dataTable.css("margin-left", -query.queryGridSettings.scrollLeft + "px");
                    headerColumnsContainer.css("margin-left", -query.queryGridSettings.scrollLeft + "px");

                    if (query.queryGridSettings.scrollTop != e.currentTarget.scrollTop) {
                        query.queryGridSettings.scrollTop = e.currentTarget.scrollTop;
                        methods.syncData(query.queryGridSettings.scrollTop);
                    }

                    viewportScrollLeft = viewport.scrollLeft();
                });
                viewport.bind("click", methods.viewportClick);
                scroller = $(!app.isTablet ? "<a>" : "<div>").addClass("dataScroller").css({
                    "background-color": "white",
                    opacity: 0,
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                    bottom: "0px",
                    right: "0px",
                });
                viewport.append(scroller);

                if(!app.isTablet)
                    viewport.bind("mousemove", methods.viewportMouseMove);

                var dataContainer = $("<div>").css({
                    overflow: "hidden",
                    position: "absolute",
                    top: headerHeight + "px",
                    left: "0px",
                    bottom: "0px", //(query.hasTotalItem ? options.rowHeight : 0) + "px",
                    right: "0px",
                    "white-space": "nowrap"
                });
                container.append(dataContainer);

                dataSelector = $("<table>").addClass("dataSelector").css({ display: "inline-block" });
                if (options.hideSelector)
                    dataSelector.addClass("noSelection");
                dataContainer.append(dataSelector);
                pinnedDataTableContainer = $("<div>").css({
                    display: "inline-block"
                }).addClass("pinnedDataTableContainer");
                pinnedDataTable = $("<table>").addClass("pinnedDataTable");
                if (ie8)
                    pinnedDataTable.css({ 'table-layout': 'fixed' });
                pinnedDataTableContainer.append(pinnedDataTable);
                dataContainer.append(pinnedDataTableContainer);
                pinnedDataTableContainer.bind("resize", methods.invalidateDataTablePosition);
                if (pinnedColumns.length == 0)
                    pinnedDataTableContainer.hide();

                dataTableContainer = $("<div>").css({
                    display: "inline-block",
                    height: "100%",
                    "vertical-align": "top",
                    "overflow": "hidden"
                }).addClass("dataTableContainer");
                dataTable = $("<table>").addClass("dataTable");
                if (ie8)
                    dataTable.css({ 'table-layout': 'fixed' });
                dataTableContainer.append(dataTable);
                dataContainer.append(dataTableContainer);
                dataTable.bind("resize", methods.invalidateDataTablePosition);

                viewportWidth = viewport.outerWidth(true);
                remainderTable = $("<table>").css({
                    display: "inline-block",
                    height: "100%",
                    width: viewportWidth + "px",
                    "vertical-align": "top",
                }).addClass("remainderTable");
                dataContainer.append(remainderTable);

                remainderRule = methods.addCssRule(data.id + " .remainderTable .contentHolder { width: " + viewportWidth + "px; }");
                data.rules.push(remainderRule);

                container.append(viewport);

                methods.createDataRows();

                query.target = container;

                if (query.queryGridSettings == null) {
                    query.queryGridSettings = {
                        scrollTop: 0,
                        scrollLeft: 0
                    };
                }
            },

            getColumns: function () {
                return query.columns.where(function (c) { return c.isHidden != true && (isNullOrEmpty(c.width) || c.width != 0); }).orderBy("offset");
            },

            getColumnsWithDivs: function () {
                if (rows != null && rows.length > 0 && rows[0].contentDivs != null) {
                    return methods.getColumns().where(function (c) {
                        return rows[0].contentDivs[c.name] != null;
                    });
                }

                return methods.getColumns();
            },

            invalidateDataTablePosition: function () {
                var selectorWidth = dataSelector.outerWidth(true);
                var pinnedDataTableWidth = pinnedDataTableContainer.outerWidth(true);
                var offset = (selectorWidth + pinnedDataTableWidth);

                headerSelector.css("width", selectorWidth);

                headerColumnsClippingContainer.css("left", offset + "px");

                var totalWidth = 0;
                for (var cr in data.columnRules) {
                    totalWidth += Math.max(data.columnRules[cr].outerWidth, data.columnRules[cr].width);
                }

                var vpWidth = viewport.innerWidth();
                var newWidth = totalWidth + selectorWidth;
                var scrollerHeight = scroller.height();
                if (scrollerHeight > viewport.innerHeight())
                    vpWidth = vpWidth - $.scrollbarWidth;

                scroller.css("width", (newWidth < vpWidth ? vpWidth : newWidth) + "px");
            },

            createDataRows: function () {
                rowCount = Math.ceil(viewport.outerHeight(true) / options.rowHeight);
                rowCount++;
                scroller.height(options.rowHeight * query.totalItems);

                rows = [];
                dataSelector.empty();
                if (ie8) {
                    pinnedDataTable.find('tr').remove();
                    dataTable.find('tr').remove();
                }
                else {
                    pinnedDataTable.empty();
                    dataTable.empty();
                }
                remainderTable.empty();

                var addColumns = function (columns, targetRow) {
                    columns.run(function (c) {
                        var column = $("<td>");
                        targetRow.append(column);

                        var content = $("<div>").addClass("contentHolder " + c.name.replace(/\./g, "_"));
                        column.append(content);

                        rows[r].contentDivs[c.name] = content;
                    });
                };

                for (var r = 0; r < rowCount; r++) {
                    rows[r] = { idx: null, contentDivs: {}, tr: [], pinnedRow: null, row: null, remainderRow: null, selector: null };

                    if (unPinnedColumns.length > 0) {
                        var pinnedRow = rows[r].pinnedRow = $("<tr>").addClass("idx_" + r);
                        if (ie8) {
                            pinnedRow.height(options.rowHeight);
                            pinnedRow.css("line-height", options.rowHeight + "px");
                        }
                        addColumns(pinnedColumns, pinnedRow);
                        pinnedDataTable.append(pinnedRow);
                        rows[r].tr.push(pinnedRow);
                    }

                    var row = rows[r].row = $("<tr>").addClass("idx_" + r);
                    if (ie8) {
                        row.height(options.rowHeight);
                        row.css("line-height", options.rowHeight + "px");
                    }
                    addColumns(unPinnedColumns, row);
                    dataTable.append(row);
                    rows[r].tr.push(row);

                    var remainderRow = rows[r].remainderRow = $("<tr>").addClass("idx_" + r).append($("<td>").append($("<div>").addClass("contentHolder")));
                    if (ie8) {
                        remainderRow.height(options.rowHeight);
                        remainderRow.width(viewportWidth);
                    }
                    remainderTable.append(remainderRow);
                    rows[r].tr.push(remainderRow);

                    var contentHolder = $("<div>").addClass("contentHolder");
                    var selectorRow = rows[r].selector = $("<tr>").addClass("noData idx_" + r).append($("<td>").append(contentHolder));
                    if (ie8)
                        contentHolder.height(options.rowHeight);

                    dataSelector.append(selectorRow);
                    rows[r].tr.push(selectorRow);
                }

                if (query.hasSearched) {
                    var scrollTop = query.queryGridSettings != null ? query.queryGridSettings.scrollTop : 0;
                    var scrollLeft = query.queryGridSettings != null ? query.queryGridSettings.scrollLeft : 0;
                    methods.syncData(scrollTop);
                    viewport.scrollTop(scrollTop);
                    viewport.scrollLeft(scrollLeft);
                }
            },

            createColumns: function (widths) {
                var totalColWidths = 0;
                var sortOptions = query.sortOptions.split(";").select(function (s) { return s.trim(); });

                var create = function (columns, targetColumnsHeader, table, isPinned) {
                    var colgroup = ie8 ? $.createElement("colgroup") : null;
                    columns.run(function (col) {
                        var span = $("<span>" + col.label + "</span>");
                        var colDiv = $("<div>").addClass("columnHeader " + col.name.replace(/\./g, "_")).dataContext({ column: col, span: span }).css({ position: "relative" });
                        if (ServiceGateway.isNumericType(col.type))
                            colDiv.css({ 'text-align': 'right' });

                        targetColumnsHeader.append(colDiv.append(span));

                        methods.addColumnSorting(colDiv, span, sortOptions.contains(col.name));

                        if (data.columnRules[col.name] != null && data.columnRules[col.name].rule != null) { data.columnRules[col.name].rule.remove(); }

                        if (String.isNullOrEmpty(col.width)) {
                            var colWidth = colDiv.innerWidth();
                            if (colWidth > widths[col.name])
                                widths[col.name] = colWidth;
                        }
                        else {
                            widths[col.name] = parseInt(col.width, 10);
                        }

                        data.columnRules[col.name] = { rule: methods.addCssRule(data.id + " ." + col.name.replace(/\./g, "_") + " { width: " + widths[col.name] + "px; }"), width: widths[col.name], outerWidth: colDiv.outerWidth(true) };
                        totalColWidths += Math.max(data.columnRules[col.name].outerWidth, widths[col.name]);

                        if (ie8) {
                            colDiv.height(24);
                            colDiv.width(widths[col.name] - (!isPinned && pinnedColumns.length > 0 ? 0 : 12) + 1);
                            colgroup.append($.createElement("col").attr({ width: widths[col.name] }));
                            return;
                        }

                        if (isNullOrEmpty(col.width)) {
                            // CREATE DRAGGERS ///////////////////////////////////////////
                            var dragger = $("<div>").css({
                                position: "absolute",
                                height: "100%",
                                width: "12px",
                                top: "0px",
                                right: "0px",
                                cursor: "col-resize"
                            }).addClass("dragger").data("colIndex", col.name);
                            colDiv.append(dragger);

                            dragger.bind("mousedown", function (e) {
                                var draggedElement = $(this);
                                var cr = data.columnRules[draggedElement.data("colIndex")];

                                var overlay = $("<div>").css({ position: "fixed", top: "0px", left: "0px", right: "0px", bottom: "0px", cursor: "col-resize", "background-color": "rgba(255, 255, 255, 0)" });
                                $(document.documentElement).append(overlay);

                                document.onselectstart = function () { return false; };

                                var x = e.screenX;
                                var left = draggedElement.css("left");
                                left = parseInt(left.substring(0, left.length - 2), 10);

                                var originalWidth = cr.width;

                                var up = function () {
                                    $(document).unbind("mouseup", up);
                                    $(document).unbind("mousemove", move);

                                    overlay.remove();

                                    document.onselectstart = undefined;
                                };

                                var move = _.throttle(function (eMove) {
                                    var diff = eMove.screenX - x;
                                    draggedElement.css("left", (left + diff) + "px");

                                    cr.width = originalWidth + diff;
                                    cr.outerWidth = draggedElement.parent().outerWidth(true);
                                    cr.rule.css("width", cr.width + "px");
                                }, 25);

                                $(document).bind("mouseup", up);
                                $(document).bind("mousemove", move);
                            });
                            //////////////////////////////////////////////////////////////
                        }
                    });

                    if (ie8) {
                        table.find('colgroup').remove();
                        table.prepend(colgroup);
                        targetColumnsHeader.width(totalColWidths + (isPinned ? 0 : $.scrollbarWidth) + columns.length);
                        table.width(totalColWidths + $.scrollbarWidth);
                    }
                };

                create(pinnedColumns, pinnedHeaderColumnsContainer, pinnedDataTable, true);
                create(unPinnedColumns, headerColumnsContainer, dataTable, false);
            },

            addColumnSorting: function (columnDiv, columnSpan, addAsc) {
                if (addAsc)
                    columnSpan.addClass("sortASC");

                columnDiv.bind("click", function () {
                    var dc = $(this).dataContext();
                    if (dc.column.disableSort == true)
                        return;

                    var appender = (!query.sortOptions.contains(dc.column.name) || query.sortOptions.toLowerCase().endsWith(" desc") ? "ASC" : "DESC");
                    query.sortOptions = dc.column.name + " " + appender;

                    query.top = query.top || query.pageSize;
                    if (query.pageSize > 0) {
                        while (query.top < rowCount)
                            query.top += query.pageSize;
                    }

                    query.search(function () {
                        methods.loadSettingsFromLocalStorage();

                        if (viewport.scrollTop() == 0)
                            methods.syncData(0);
                        else
                            viewport.scrollTop(0);

                        header.find("span").removeClass("sortASC sortDESC");
                        if (query.sortOptions.contains(dc.column.name))
                            dc.span.addClass("sort" + appender);
                    });
                });
            },

            syncData: function (top, skipGetItems) {
                max = Math.max(viewport[0].scrollHeight - viewport.height(), 0); // This can be negative when there is a horizontal scrollbar, but no vertical
                var position = (max == 0) ? 0 : (top >= max ? 1 : 1 / max * top);
                if (isNaN(position) || position < 0)
                    position = 0;

                var visibleRows = Math.floor((dataTableContainer.innerHeight() - (scroller.outerWidth() > viewport.width() ? $.scrollbarWidth : 0)) / options.rowHeight);
                start = Math.floor((query.totalItems - visibleRows) * position);

                for (var r = 0; r < rowCount; r++) {
                    var idx = query.items[start + r] != null && data.columnRules != null ? start + r : null;
                    rows[r].idx = idx;

                    if (data.extraClasses.length > 0)
                        rows[r].tr.run(function (tr) { tr.removeClass(data.extraClasses.join(" ")); });

                    if (idx != null) {
                        var extraClass = query.items[start + r].getTypeHint("ExtraClass");
                        if (!isNullOrEmpty(extraClass)) {
                            data.extraClasses = data.extraClasses.concat(extraClass.split(" ")).distinct();
                            rows[r].tr.run(function (tr) { tr.addClass(extraClass); });
                        }
                    }
                    methods.getColumnsWithDivs().run(function (col) {
                        if (idx == null) {
                            rows[r].contentDivs[col.name][0].innerText = "";
                            rows[r].selector.addClass("noData");
                            rows[r].selector.removeClass("hasData");
                        }
                        else {
                            rows[r].contentDivs[col.name][0].innerHTML = col.render(query.items[idx].values);
                            rows[r].selector.removeClass("noData");
                            rows[r].selector.addClass("hasData");
                        }
                    });
                }

                methods.removeHoverRule();

                if (query.pageSize == 0) {
                    methods.onDataReceived();
                    return;
                }

                var length = rowCount;
                if (start + length > query.totalItems)
                    length = query.totalItems - start;

                if (start in query.items && start + length - 1 in query.items) {
                    var returnItems = query.items.slice(start, start + length);
                    if (returnItems.length == length) {
                        methods.onDataReceived();
                        return;
                    }
                }

                if (skipGetItems != true)
                    getItemsThrottled(start, length, methods.onDataReceived);
            },

            onDataReceived: function () {
                if (container.length == 0 || container.dataContext() != query) {
                    rootContainer.unbind("itemsChanged");
                    rootContainer.unbind("selectedItemsChanged");
                    return;
                }

                var widths = {};
                var calculateWidths = data.columnRules == null && query.hasSearched;
                if (calculateWidths)
                    data.columnRules = {};

                for (var r = 0; r < rowCount; r++) {
                    var idx = start + r;
                    var item = query.items[idx];
                    if (rows[r].idx == null && item != null) {
                        rows[r].idx = idx;
                        rows[r].selector.removeClass("noData");
                        rows[r].selector.addClass("hasData");
                        if (data.extraClasses.length > 0)
                            rows[r].tr.run(function (tr) { tr.removeClass(data.extraClasses.join(" ")); });

                        var extraClass = item.getTypeHint("ExtraClass");
                        if (!isNullOrEmpty(extraClass)) {
                            data.extraClasses = data.extraClasses.concat(extraClass.split(" ")).distinct();
                            rows[r].tr.run(function (tr) { tr.addClass(extraClass); });
                        }

                        methods.getColumnsWithDivs().run(function (col) {
                            rows[r].contentDivs[col.name][0].innerHTML = col.render(item.values);
                        });
                    }
                }

                if (calculateWidths) {
                    methods.getColumnsWithDivs().run(function (col) {
                        var width = rows[0].contentDivs[col.name].innerWidth();
                        if (widths[col.name] == null || width > widths[col.name])
                            widths[col.name] = Math.round(width * 1.1);
                    });

                    methods.createColumns(widths);
                }

                methods.hover(currentRowHoverIdx);
                methods.updateSelectedRowRules();
            },

            viewportMouseMove: function (e) {
                var clientX = e.clientX - dataSelectorWidth - viewportOffset.left;
                var x = clientX + (clientX < pinnedWidth ? 0 : viewportScrollLeft);

                var columns = [];
                if (clientX < pinnedWidth) {
                    for (var i = 0; i < pinnedColumns.length; i++) {
                        columns.push(pinnedColumns[i].name);
                    }
                }

                for (var cr in data.columnRules) {
                    if (!columns.contains(cr))
                        columns.push(cr);
                }

                for (var i = 0; i < columns.length; i++) {
                    var cr = columns[i];
                    var width = Math.max(data.columnRules[cr].outerWidth, data.columnRules[cr].width);
                    if (x > width)
                        x -= width;
                    else {
                        selectedColumn = query.getColumn(cr);
                        break;
                    }
                }

                methods.hover(Math.floor((e.clientY - viewportOffset.top) / options.rowHeight));
            },

            viewportClick: function (e) {
                if (e.ctrlKey == true)
                    return;

                if (app.isTablet)
                    methods.viewportMouseMove(e);

                if (currentRowHoverIdx >= 0) {
                    var selectedItems = (query.items.selectedItems() || []).slice();
                    var index = start + currentRowHoverIdx;
                    var selectedItem = query.items[index];

                    if (isNull(selectedItem))
                        return;

                    e = $.fixFireFoxOffset(e);

                    if (options.hideSelector || e.offsetX - $(".viewport").scrollLeft() > dataSelector.width())
                        query.onItemClicked(selectedItem, selectedColumn);
                    else {
                        if (e.shiftKey && !isNull(lastSelectedIndex)) {
                            for (var i = Math.min(index, lastSelectedIndex) ; i <= Math.max(index, lastSelectedIndex) ; i++) {
                                var item = query.items[i];

                                if (item == null || selectedItems.contains(item))
                                    continue;

                                selectedItems.push(item);
                            }
                        } else {
                            if (!selectedItems.contains(selectedItem))
                                selectedItems.push(selectedItem);
                            else {
                                selectedItems.remove(selectedItem);
                                index = null;
                            }
                        }

                        query.updateSelectedItems(selectedItems);
                        lastSelectedIndex = index;
                    }
                }
                e.preventDefault();
                e.stopPropagation();
            },

            updateSelectedRowRules: function () {
                var selectedItems = query.items.selectedItems() || [];
                var selectedIndexes = [];
                selectedItems.run(function (item) {
                    var idx = query.items.indexOf(item) - start;
                    if (idx >= 0 && idx < rowCount)
                        selectedIndexes.push(idx);
                });

                rows.run(function (row) {
                    row.row.removeClass("selected");
                    row.remainderRow.removeClass("selected");
                    if (row.pinnedRow != null) row.pinnedRow.removeClass("selected");
                    row.selector.removeClass("selected");
                });

                selectedIndexes.run(function (idx) {
                    rows[idx].row.addClass("selected");
                    rows[idx].remainderRow.addClass("selected");
                    if (rows[idx].pinnedRow != null) rows[idx].pinnedRow.addClass("selected");
                    rows[idx].selector.addClass("selected");
                });
            },

            addCssRule: function (css) {
                return $.rule(css).appendTo("style");
            },

            hover: function (index) {
                if (index != currentRowHoverIdx || scroller.css("cursor") != "pointer") {
                    currentRowHoverIdx = index;

                    methods.removeHoverRule();

                    if (rows[index] != null && rows[index].idx != null) {
                        rows[index].row.addClass("hover");
                        rows[index].remainderRow.addClass("hover");

                        if (!app.isTablet)
                            scroller.attr("href", "#!/" + app.getUrlForPersistentObject({ id: q.persistentObject.id, objectId: query.items[start + currentRowHoverIdx].id }));

                        if (rows[index].pinnedRow != null) rows[index].pinnedRow.addClass("hover");
                        rows[index].selector.addClass("hover");

                        scroller.css("cursor", "pointer");
                    }
                }
                else if (rows[index] != null && rows[index].idx == null)
                    methods.removeHoverRule();
            },

            removeHoverRule: function () {
                rows.run(function (row) {
                    row.row.removeClass("hover");
                    row.remainderRow.removeClass("hover");
                    if (row.pinnedRow != null) row.pinnedRow.removeClass("hover");
                    row.selector.removeClass("hover");
                });

                if (!app.isTablet)
                    scroller.removeAttr("href");

                scroller.css("cursor", "default");
            },

            toggleManagement: function () {
                var overlay = $("<div>").addClass("managementDialogOverlay").css({ position: "absolute", top: "0px", left: "0px", right: "0px", bottom: "0px" });
                container.append(overlay);

                var mgmtContainer = $("<div>").addClass("managementDialogContainer").css({ position: "absolute", top: "0px", left: "0px", right: "0px", bottom: "0px" });
                container.append(mgmtContainer);

                var managementDialog = $("<div>").addClass("managementDialog").css({ position: "relative" });
                managementDialog.width(Math.min(500, overlay.innerWidth() * 0.45));
                var dialogHeight = Math.min(mgmtContainer.innerHeight(), 300);
                managementDialog.height(dialogHeight);
                managementDialog.css({ "margin-top": (mgmtContainer.innerHeight() / 2 - dialogHeight / 2) + "px" });

                mgmtContainer.bind("resize", function () {
                    managementDialog.height(Math.min(mgmtContainer.innerHeight(), 300));
                    managementDialog.css({ "margin-top": (mgmtContainer.innerHeight() / 2 - managementDialog.height() / 2) + "px" });
                });

                var dialogHeader = $("<div>").addClass("managementHeader").text(query.label);
                managementDialog.append(dialogHeader);
                var footer = $("<div>").addClass("managementFooter").css({ bottom: "0px", left: "0px", right: "0px", position: "absolute" });
                managementDialog.append(footer);

                var cancel = $("<div>").text(app.getTranslatedMessage("Cancel")).css({ 'float': "right" });
                cancel.bind("click", function () {
                    mgmtContainer.remove();
                    overlay.remove();
                });
                footer.append(cancel);

                var save = $("<div>").text(app.getTranslatedMessage("Save")).css({ 'float': "right" });
                footer.append(save);

                var reset = $("<div>").text(app.getTranslatedMessage("Reset")).css({ 'float': "left" });
                footer.append(reset);
                reset.bind("click", function () {
                    methods.resetSettingsInLocalStorage();

                    query.search(function () {
                        mgmtContainer.remove();
                        overlay.remove();

                        methods.create();
                    });
                });

                cancel.button();
                save.button();
                reset.button();

                mgmtContainer.append(managementDialog);

                var mgmtTableContainer = $.createElement("div").css({ overflow: "auto", top: dialogHeader.outerHeight(true) + "px", left: "0px", right: "0px", bottom: footer.outerHeight(true) + "px", position: "absolute" });
                var mgmtTable = $.createElement("table");
                mgmtTableContainer.append(mgmtTable);

                var mgmtTableHeader = $.createElement("thead");
                mgmtTable.append(mgmtTableHeader);

                var headerRow = $.createElement("tr");
                mgmtTableHeader.append(headerRow);

                managementDialog.append(mgmtTableContainer);

                var firstIconColumn = $("<div>").addClass("iconColumn");
                headerRow.append($("<th>").append(firstIconColumn));
                var columnLabelDiv = $("<div>").width(managementDialog.innerWidth() - (5 * firstIconColumn.outerWidth(true)));
                headerRow.append($("<th>").append($("<div>").addClass("iconColumn")));
                headerRow.append($("<th>").append(columnLabelDiv));
                headerRow.append($("<th>").append($("<div>").addClass("iconColumn isPinnedHeader")));
                headerRow.append($("<th>").append($("<div>").addClass("iconColumn isVisibleHeader")));

                var mgmtTableBody = $.createElement("tbody");
                mgmtTable.append(mgmtTableBody);

                var columnsData = [];
                query.columns.where(function (c) { return c.isPinned == true && c.width != 0; }).orderBy("offset").run(function (c) {
                    columnsData.push({ name: c.name, label: c.label, isHidden: c.isHidden, offset: c.offset, isPinned: true });
                });

                query.columns.where(function (c) { return c.isPinned != true && c.width != 0; }).orderBy("offset").run(function (c) {
                    columnsData.push({ name: c.name, label: c.label, isHidden: c.isHidden, offset: c.offset, isPinned: false });
                });

                methods.updateManagementRows(columnsData, mgmtTableBody);

                save.bind("click", function () {
                    methods.saveSettingsToLocalStorage(columnsData);

                    mgmtContainer.remove();
                    overlay.remove();

                    methods.create();
                });
            },

            updateManagementRows: function (columnsData, target) {
                target.empty();

                var newColumnsData = [];
                columnsData.where(function (c) { return c.isPinned; }).orderBy("offset").run(function (c) {
                    newColumnsData.push(c);
                });
                columnsData.where(function (c) { return !c.isPinned; }).orderBy("offset").run(function (c) {
                    newColumnsData.push(c);
                });
                columnsData.splice(0, columnsData.length);
                newColumnsData.run(function (c) { columnsData.push(c); });

                for (var i = 0; i < columnsData.length; i++) {
                    var col = columnsData[i];
                    var nextCol = i + 1 < columnsData.length ? columnsData[i + 1] : null;
                    var previousCol = i - 1 >= 0 ? columnsData[i - 1] : null;
                    methods.addManagementRow(col, nextCol, previousCol, columnsData, target);
                }
            },

            addManagementRow: function (col, nextCol, previousCol, columnsData, target) {
                var moveUp = $("<div>").addClass("iconColumn");
                if (previousCol != null && previousCol.isPinned == col.isPinned) {
                    moveUp.addClass("moveUp");
                    moveUp.bind("click", function () {
                        var temp = previousCol.offset;
                        previousCol.offset = col.offset;
                        col.offset = temp;

                        methods.updateManagementRows(columnsData, target);
                    });
                }

                var moveDown = $("<div>").addClass("iconColumn");
                if (nextCol != null && nextCol.isPinned == col.isPinned) {
                    moveDown.addClass("moveDown");
                    moveDown.bind("click", function () {
                        var temp = nextCol.offset;
                        nextCol.offset = col.offset;
                        col.offset = temp;

                        methods.updateManagementRows(columnsData, target);
                    });
                }

                var isPinned = $("<div>").addClass("iconColumn isPinned");
                if (col.isPinned)
                    isPinned.addClass("checked");

                isPinned.bind("click", function () {
                    col.isPinned = !col.isPinned;
                    $(this).toggleClass("checked");
                    methods.updateManagementRows(columnsData, target);
                });

                var isVisible = $("<div>").addClass("iconColumn isVisible");
                if (col.isHidden != true)
                    isVisible.addClass("checked");

                isVisible.bind("click", function () {
                    col.isHidden = !col.isHidden;

                    $(this).toggleClass("checked");
                    methods.updateManagementRows(columnsData, target);
                });

                var row = $("<tr>");
                if (col.isPinned && nextCol != null && !nextCol.isPinned)
                    row.addClass("lastPinnedRow");

                row.append($("<td>").append(moveUp));
                row.append($("<td>").append(moveDown));
                row.append($("<td>").append($("<div>").text(col.label)));
                row.append($("<td>").append(isPinned));
                row.append($("<td>").append(isVisible));
                target.append(row);

                return row;
            },

            resetSettingsInLocalStorage: function () {
                var settings = localStorage.getItem("QueryGridSettings");

                if (settings == null)
                    settings = new Object();
                else
                    settings = JSON.parse(settings);

                if (settings[query.id] != null)
                    delete settings[query.id];

                localStorage.setItem("QueryGridSettings", JSON.stringify(settings));
            },

            loadSettingsFromLocalStorage: function () {
                var settings = localStorage.getItem("QueryGridSettings");

                if (settings == null)
                    return;

                settings = JSON.parse(settings)[query.id];

                if (settings == null)
                    return;

                query.columns.where(function (c) { return c.width != 0; }).orderBy("offset").run(function (c) {
                    var setting = settings[c.name];

                    if (setting == null)
                        return;

                    c.offset = setting.offset || setting.Offset;
                    c.isPinned = setting.isPinned || setting.IsPinned;
                    c.isHidden = setting.isHidden || setting.IsHidden;
                });
            },

            saveSettingsToLocalStorage: function (columnsData) {
                var settings = localStorage.getItem("QueryGridSettings");

                if (settings == null)
                    settings = new Object();
                else
                    settings = JSON.parse(settings);

                if (settings[query.id] == null)
                    settings[query.id] = new Object();

                columnsData.run(function (column) {
                    settings[query.id][column.name] = { offset: column.offset, isPinned: column.isPinned, isHidden: column.isHidden };
                });

                localStorage.setItem("QueryGridSettings", JSON.stringify(settings));
            }
        };

        options = options || {};
        if (options.rowHeight == null) {
            options.rowHeight = 30;
            methods.getColumnsWithDivs().run(function (c) {
                options.rowHeight = Math.max(options.rowHeight, parseInt(c.getTypeHint("RowHeight", "0").replace("px", ""), 10));
            });
        }

        methods.create();
    };
})(jQuery);