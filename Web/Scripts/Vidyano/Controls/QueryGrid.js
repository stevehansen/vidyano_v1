(function ($, undefined) {
    "use strict";

    $.queryGridData = [];
    $.cleanUpGridData = function () {
        // Cleanup all orphan styles
        var dataObjects = $.queryGridData.slice(0);
        for (var i = 0; i < dataObjects.length; i++) {
            var obj = dataObjects[i];
            if ($(obj.id).length == 0) {
                $.queryGridData.splice(i, 1);
                obj.rules.forEach(function (r) { r.remove(); });
                for (var cr in obj.columnRules) {
                    obj.columnRules[cr].colHeaderDiv = null;
                    obj.columnRules[cr].rule.remove();
                }
            }
        }
    };
    $.queryGridHoverStyle = $.rule(".queryGrid tr.hover").text();

    var originalOncontextmenu = window.oncontextmenu;
    window.oncontextmenu = function (e) {
        if (originalOncontextmenu)
            originalOncontextmenu(e);

        var element = $(e.toElement || e.srcElement || e.originalTarget || e.relatedTarget);
        if (element.hasClass("dataScroller")) {
            var href = element.data("href");
            if (href) {
                element.attr("href", href);
                setTimeout(function () {
                    element.removeAttr("href");
                }, 100);
            }
        }
    };

    $(function () {
        var inner = document.createElement('p');
        inner.style.width = "100%";
        inner.style.height = "100px";

        var outer = document.createElement('div');
        outer.style.position = "absolute";
        outer.style.top = "0px";
        outer.style.left = "0px";
        outer.style.visibility = "hidden";
        outer.style.width = "50px";
        outer.style.height = "50px";
        outer.appendChild(inner);

        document.body.appendChild(outer);
        outer.style.overflow = "hidden";
        var w1 = inner.offsetWidth;
        outer.style.overflow = 'scroll';
        var w2 = inner.offsetWidth;
        if (w1 == w2) w2 = outer.clientWidth;

        $.scrollbarWidth = (w1 - w2);

        inner.style.width = "100px";
        inner.style.height = "100%";
        outer.style.overflow = "hidden";
        w1 = inner.offsetHeight;
        outer.style.overflow = 'scroll';
        w2 = inner.offsetHeight;
        if (w1 == w2) w2 = outer.clientHeight;

        $.scrollbarHeight = (w1 - w2);

        document.body.removeChild(outer);
    });

    $.fn.queryGrid = function (q, options) {
        var query = q;
        var unPinnedColumns = [];
        var pinnedColumns = [];
        var getItemsThrottled = _.debounce(function (s, length, onComplete, onError) { query.getItems(s, length, onComplete, onError); }, 250);
        var rootContainer = this;
        var container = null;
        var header, headerSelector, headerColumnsClippingContainer, pinnedHeaderColumnsContainer, headerColumnsContainer, totalContainer, totalContainerVisible, totalScroller, total, totalSelector, pinnedTotalColumnsContainer, totalColumnsClippingContainer, totalColumnsContainer, viewport, viewportWidth, scroller, dataTable, dataTableContainer, pinnedDataTableContainer, pinnedDataTable, rowHeader, dataContainer;
        var rows = [];
        var totals = {};
        var rowCount;
        var data = {};
        var start = 0, max = 0;
        var currentRowHoverIdx = -1;
        var remainderRule;
        var columnCount;
        var lastSelectedIndex;
        var selectedColumn;
        var pinnedWidth, dataSelectorWidth, viewportOffset;

        var methods = {
            refresh: function (e, q) {
                if (q != query)
                    return;

                if (container.length == 0 || container.dataContext() != query) {
                    rootContainer.off("itemsChanged");
                    rootContainer.off("selectedItemsChanged");
                    return;
                }

                rootContainer.off("itemsChanged");
                rootContainer.on("itemsChanged", methods.refresh);
                rootContainer.off("selectedItemsChanged");
                rootContainer.on("selectedItemsChanged", methods.updateSelectedRowRules);

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

                rootContainer.off("itemsChanged");
                rootContainer.on("itemsChanged", methods.refresh);
                rootContainer.off("selectedItemsChanged");
                rootContainer.on("selectedItemsChanged", methods.updateSelectedRowRules);

                methods.loadSettingsFromLocalStorage();

                unPinnedColumns = methods.getColumns().filter(function (c) { return c.isPinned != true; });
                pinnedColumns = methods.getColumns().filter(function (c) { return c.isPinned == true; });

                data = { id: ".queryGrid" + getRandom(), rules: [], columnRules: null, extraClasses: [] };
                data.rules.push(methods.addCssRule(data.id + " .contentHolder { height: " + options.rowHeight + "px; line-height: " + options.rowHeight + "px; white-space: nowrap; overflow: hidden; }"));

                if (container != null)
                    container.remove();

                container = $("<div>").css({ "width": "100%", "height": "100%", "box-sizing": "border-box", "-moz-box-sizing": "border-box", "position": "relative" });
                rootContainer.append(container);

                // Remove previously unique querygrid id's
                var containerClass = container.attr('class') || "";
                $.each(containerClass.split(/\s+/), function (index, item) {
                    if (item.startsWith("queryGrid"))
                        container.removeClass(item);
                });
                $.cleanUpGridData();
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

                if (options.allowSelectAll) {
                    headerSelector.addClass("allowSelection");
                    headerSelector.on("click", function () {
                        query.selectToggle();

                        methods.updateSelectionIndicator();
                    });

                }
                methods.updateSelectionIndicator();
                header.append(headerSelector);

                pinnedHeaderColumnsContainer = $("<div>").addClass("pinnedHeaderColumnsContainer").css({ display: "inline-block", overflow: "hidden" });
                header.append(pinnedHeaderColumnsContainer);

                headerColumnsClippingContainer = $("<div>").addClass("headerColumnsClippingContainer").css({ display: "inline-block", overflow: "hidden" });
                headerColumnsContainer = $("<div>").addClass("headerColumnsContainer").css({ width: "50000px" });
                headerColumnsClippingContainer.append(headerColumnsContainer);
                header.append(headerColumnsClippingContainer);

                if ((!query.isSystem && query.semanticZoomOwner == null && !options.hideSemanticZoom) || !options.hideManagement) {
                    var managementButtonContainer = $("<div>").addClass("managementButtonContainer");
                    header.append(managementButtonContainer);

                    if (!query.isSystem && query.semanticZoomOwner == null && !options.hideSemanticZoom) {
                        var semanticZoomButton = $("<div>").addClass("semanticZoomButton");
                        managementButtonContainer.append(semanticZoomButton);
                        semanticZoomButton.on("click", function () { query.semanticZoom(); });
                    } else
                        managementButtonContainer.css({ width: "24px" });

                    if (!options.hideManagement) {
                        var managementButton = $("<div>").addClass("managementButton");
                        managementButtonContainer.append(managementButton);
                        managementButton.on("click", methods.toggleManagement);
                    }
                }

                viewport = $("<div>").addClass("viewport").css({
                    overflow: "auto",
                    position: "absolute",
                    top: headerHeight + "px",
                    left: "0",
                    bottom: "0",
                    right: "0",
                    width: "100%"
                });

                viewport.on("scroll", function (e) {
                    if (query.queryGridSettings.scrollLeft != e.currentTarget.scrollLeft) {
                        query.queryGridSettings.scrollLeft = e.currentTarget.scrollLeft;

                        dataTable.css("margin-left", -query.queryGridSettings.scrollLeft + "px");
                        headerColumnsContainer.css("margin-left", -query.queryGridSettings.scrollLeft + "px");
                        totalColumnsContainer.css("margin-left", -query.queryGridSettings.scrollLeft + "px");
                    }

                    if (query.queryGridSettings.scrollTop != e.currentTarget.scrollTop) {
                        query.queryGridSettings.scrollTop = e.currentTarget.scrollTop;
                        methods.syncData(query.queryGridSettings.scrollTop);
                    }

                    methods.updatePendingSetCellContents();
                });
                viewport.on("click", methods.viewportClick);
                scroller = $(!app.isTablet && query.canRead ? "<a>" : "<div>").addClass("dataScroller").css({
                    "background-color": "white",
                    opacity: 0,
                    position: "absolute",
                    top: "0",
                    left: "0",
                    bottom: "0",
                    right: "0",
                });
                viewport.append(scroller);

                if (!app.isTablet)
                    viewport.on("mousemove", methods.viewportMouseMove);

                dataContainer = $("<div>").css({
                    overflow: "hidden",
                    position: "absolute",
                    top: headerHeight + "px",
                    left: "0",
                    bottom: "0",
                    right: "0",
                    "white-space": "nowrap"
                });
                container.append(dataContainer);

                rowHeader = $("<table>").addClass("dataSelector").css({ display: "inline-block" });
                if (options.hideSelector)
                    rowHeader.addClass("noSelection");
                dataContainer.append(rowHeader);

                pinnedDataTableContainer = $("<div>").css({
                    display: "inline-block",
                    "vertical-align": "top",
                }).addClass("pinnedDataTableContainer");
                pinnedDataTable = $("<table>").addClass("pinnedDataTable");
                pinnedDataTableContainer.append(pinnedDataTable);
                dataContainer.append(pinnedDataTableContainer);
                if (pinnedColumns.length == 0)
                    pinnedDataTableContainer.hide();

                dataTableContainer = $("<div>").css({
                    display: "inline-block",
                    height: "100%",
                    "vertical-align": "top",
                    "overflow": "hidden"
                }).addClass("dataTableContainer");
                dataTable = $("<table>").addClass("dataTable");
                dataTableContainer.append(dataTable);
                dataContainer.append(dataTableContainer);

                viewportWidth = viewport.outerWidth(true);

                remainderRule = methods.addCssRule(data.id + " .contentHolder.remainder { width: " + viewportWidth + "px; }");
                data.rules.push(remainderRule);

                totalContainer = $("<div>").addClass("totalContainer").css({
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    display: "none"
                });

                total = $("<div>").addClass("total").css({
                    height: options.rowHeight + "px",
                    position: "relative",
                    "overflow": "hidden",
                    "white-space": "nowrap"
                });
                totalContainer.append(total);

                var totalScrollerContainer = $("<div>").css({
                    position: "relative",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    "overflow-x": "auto",
                    "overflow-y": "hidden",
                });

                totalScroller = $("<div>").addClass("dataScroller").css({
                    "background-color": "transparent",
                    height: "1px"
                });

                totalScrollerContainer.append(totalScroller);
                totalContainer.append(totalScrollerContainer);

                container.append(totalContainer);

                totalScrollerContainer.on("scroll", function () {
                    viewport.scrollLeft(totalScrollerContainer.scrollLeft());
                });

                totalSelector = $("<div>").addClass("totalSelector").append($("<div>"));
                total.append(totalSelector);

                pinnedTotalColumnsContainer = $("<div>").addClass("pinnedTotalColumnsContainer").css({ display: "inline-block", overflow: "hidden" });
                total.append(pinnedTotalColumnsContainer);

                totalColumnsClippingContainer = $("<div>").addClass("totalColumnsClippingContainer").css({ display: "inline-block", overflow: "hidden" });
                totalColumnsContainer = $("<div>").addClass("totalColumnsContainer").css({ width: "50000px" });
                totalColumnsClippingContainer.append(totalColumnsContainer);
                total.append(totalColumnsClippingContainer);

                container.append(viewport);
                query.target = container;

                if (query.queryGridSettings == null) {
                    query.queryGridSettings = {
                        scrollTop: 0,
                        scrollLeft: 0
                    };
                }

                methods.invalidateViewPort();

                viewport.on("resize", methods.invalidateViewPort);
                pinnedDataTableContainer.on("resize", methods.invalidateDataTablePosition);
                dataTable.on("resize", methods.invalidateDataTablePosition);
                totalContainer.on("resize", function () {
                    dataContainer.css("bottom", (totalContainer.is(":visible") ? totalContainer.outerHeight() : 0) + "px");
                });

                scroller.on("click", function (e) {
                    if (e.ctrlKey) {
                        var href = scroller.data("href");
                        if (href) {
                            scroller.attr("href", href);
                            setTimeout(function () {
                                scroller.removeAttr("href");
                            }, 100);
                        }
                    }
                });
            },

            getColumns: function () {
                return query.columns.filter(function (c) { return c.isHidden != true && (isNullOrEmpty(c.width) || c.width != 0); }).orderBy("offset");
            },

            getColumnsWithDivs: function () {
                if (rows != null && rows.length > 0 && rows[0].contentDivs != null) {
                    return methods.getColumns().filter(function (c) {
                        return rows[0].contentDivs[c.name] != null;
                    });
                }

                return methods.getColumns();
            },

            invalidateViewPort: function () {
                methods.invalidateTotalRowVisibility();

                viewportWidth = viewport.outerWidth(true);
                methods.createDataRows();

                remainderRule.css("width", viewportWidth + "px");
                methods.invalidateDataTablePosition();

                pinnedWidth = pinnedDataTableContainer.outerWidth(true);
                dataSelectorWidth = rowHeader.outerWidth(true);
                viewportOffset = viewport.offset();

                for (var name in data.columnRules) {
                    if (!data.columnRules[name].offsetLeft)
                        data.columnRules[name].offsetLeft = data.columnRules[name].colHeaderDiv.offset().left - viewportOffset.left;
                }
            },

            invalidateDataTablePosition: function () {
                var selectorWidth = rowHeader.outerWidth(true);
                var pinnedDataTableWidth = pinnedDataTableContainer.outerWidth(true);
                var offset = (selectorWidth + pinnedDataTableWidth);

                headerSelector.css("width", selectorWidth);
                totalSelector.css("width", selectorWidth);

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

                var scrollerWidth = (newWidth < vpWidth ? vpWidth : newWidth) + "px";
                scroller.css("width", scrollerWidth);
                totalScroller.css("width", scrollerWidth);

                methods.invalidateTotalRowVisibility();
            },

            invalidateTotalRowVisibility: function () {
                dataContainer.css("bottom", query.hasTotalItem ? totalContainer.outerHeight() + "px" : "0");

                if (query.hasTotalItem) {
                    totalContainer.show();
                    totalContainerVisible = true;
                    viewport.css({
                        "overflow-x": "hidden",
                        "bottom": totalContainer.height() + "px"
                    });
                }
                else {
                    totalContainer.hide();
                    totalContainerVisible = false;
                    viewport.css({
                        "overflow-x": "auto",
                        "bottom": "0"
                    });
                }
            },

            createDataRows: function () {
                rowCount = Math.ceil(viewport.outerHeight(true) / options.rowHeight);
                rowCount++;
                scroller.height(options.rowHeight * query.totalItems);

                rows = [];
                rowHeader.empty();
                pinnedDataTable.empty();
                dataTable.empty();

                var addColumns = function (columns, targetRow) {
                    columns.forEach(function (c) {
                        var column = $("<td>");
                        targetRow.append(column);

                        var content = $("<div>").addClass("contentHolder " + c.safeName());
                        column.append(content);

                        rows[r].contentDivs[c.name] = content;
                    });
                };

                for (var r = 0; r < rowCount; r++) {
                    rows[r] = { idx: null, contentDivs: {}, tr: [], pinnedRow: null, row: null, selector: null };

                    if (unPinnedColumns.length > 0) {
                        var pinnedRow = rows[r].pinnedRow = $("<tr>").addClass("noData idx_" + r + " " + (r % 2 == 0 ? "even" : "odd"));
                        addColumns(pinnedColumns, pinnedRow);
                        pinnedDataTable.append(pinnedRow);
                        rows[r].tr.push(pinnedRow);
                    }

                    var row = rows[r].row = $("<tr>").addClass("noData idx_" + r + " " + (r % 2 == 0 ? "even" : "odd"));
                    addColumns(unPinnedColumns, row);

                    row.append($("<td>").append($("<div>").addClass("contentHolder remainder")));

                    dataTable.append(row);
                    rows[r].tr.push(row);

                    var contentHolder = $("<div>").addClass("contentHolder");
                    var selectorRow = rows[r].selector = $("<tr>").addClass("noData idx_" + r + " " + (r % 2 == 0 ? "even" : "odd")).append($("<td>").append(contentHolder));

                    if (!options.hideInlineActions) {
                        query.actions.filter(function (a) { return a.isInline(); }).forEach(function (a) {
                            var icon = app.icons[a.icon];
                            if (icon == null || isNullOrWhiteSpace(icon.data))
                                return;

                            var inlineAction = $.createElement("div", a).addClass('inlineAction').css("height", options.rowHeight + "px");
                            var height = 20;

                            var inlineActionImage = $("<div>").addClass(a.iconClass).css("margin-top", Math.floor(options.rowHeight / 2 - height / 2));
                            inlineAction.append(inlineActionImage);

                            var inlineInvertedActionImage = $("<div>").addClass("inverted " + a.reverseIconClass).css("margin-top", Math.floor(options.rowHeight / 2 - height / 2));
                            inlineAction.append(inlineInvertedActionImage);

                            selectorRow.append($("<td>").append(inlineAction));
                        });
                    }

                    rowHeader.append(selectorRow);
                    rows[r].tr.push(selectorRow);
                }

                if (query.hasTotalItem) {
                    pinnedTotalColumnsContainer.empty();
                    totalColumnsContainer.empty();

                    var addTotalColumns = function (columns, target) {
                        columns.forEach(function (c) {
                            var colTotalDiv = $("<div>").addClass("columnTotal " + c.safeName()).dataContext({ column: c }).css("line-height", options.rowHeight + "px");
                            target.append(colTotalDiv);

                            totals[c.name] = { "colTotalDiv": colTotalDiv, col: c };
                        });
                    };

                    addTotalColumns(pinnedColumns, pinnedTotalColumnsContainer);
                    addTotalColumns(unPinnedColumns, totalColumnsContainer);
                }

                if (query.hasSearched) {
                    var scrollTop = query.queryGridSettings != null ? query.queryGridSettings.scrollTop : 0;
                    methods.syncData(scrollTop);

                    if (scrollTop > 0)
                        viewport.scrollTop(scrollTop);

                    var scrollLeft = query.queryGridSettings != null ? query.queryGridSettings.scrollLeft : 0;
                    if (scrollLeft > 0)
                        viewport.scrollLeft(scrollLeft);
                }
            },

            createColumns: function (widths) {
                var totalColWidths = 0;
                var sortOptions = query.sortOptions.split(";").map(function (s) { return s.trim(); });

                var multiStageLayout = {};
                var create = function (columns, targetColumnsHeader) {
                    columns.forEach(function (col) {
                        var span = $("<span>");
                        span.text(col.label);

                        var colHeaderDiv = $("<div>").addClass("columnHeader " + col.safeName()).dataContext({ column: col, span: span }).css({ position: "relative" });
                        targetColumnsHeader.append(colHeaderDiv.append(span));

                        methods.addColumnSorting(colHeaderDiv, span, sortOptions.firstOrDefault(function (s) { return s == col.name || s == col.name + " ASC" || s == col.name + " DESC"; }));

                        // TODO: Remove css rule in another stage
                        if (data.columnRules[col.name] != null && data.columnRules[col.name].rule != null) { data.columnRules[col.name].rule.remove(); }
                        multiStageLayout[col.name] = { 'colHeaderDiv': colHeaderDiv, 'col': col }; // Note: this is for minimizing the amount of layout passes

                        // CREATE DRAGGERS ///////////////////////////////////////////
                        var dragger = $("<div>").css({
                            position: "absolute",
                            height: "100%",
                            width: "12px",
                            top: "0",
                            right: "0",
                            cursor: "col-resize"
                        }).addClass("dragger").data("colIndex", col.name);
                        colHeaderDiv.append(dragger);

                        dragger.on("mousedown", function (e) {
                            var draggedElement = $(this);
                            var cr = data.columnRules[draggedElement.data("colIndex")];

                            var overlay = $("<div>").css({ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", cursor: "col-resize", "background-color": "rgba(255, 255, 255, 0)" });
                            $(document.documentElement).append(overlay);

                            document.onselectstart = function () { return false; };

                            var x = e.screenX;
                            var left = draggedElement.css("left");
                            left = parseInt(left.substring(0, left.length - 2), 10);

                            var originalWidth = cr.width;

                            var up = function () {
                                $(document).off("mouseup", up);
                                $(document).off("mousemove", move);

                                overlay.remove();

                                document.onselectstart = undefined;

                                cr.dragWidth = cr.width;
                                methods.saveSettingsToLocalStorage();
                            };

                            var move = _.throttle(function (eMove) {
                                var diff = eMove.screenX - x;
                                draggedElement.css("left", (left + diff) + "px");

                                cr.width = originalWidth + diff;
                                cr.outerWidth = draggedElement.parent().outerWidth(true);

                                methods.updatePendingSetCellContents(diff);

                                cr.rule.css("width", cr.width + "px");
                            }, 25);

                            $(document).on("mouseup", up);
                            $(document).on("mousemove", move);
                        });
                        //////////////////////////////////////////////////////////////
                    });
                };

                create(pinnedColumns, pinnedHeaderColumnsContainer);
                create(unPinnedColumns, headerColumnsContainer);

                // Note: multiStageLayout is traversed multiple times for minimizing the amount of layout passes
                for (var name in multiStageLayout) {
                    var col = multiStageLayout[name].col;

                    if (String.isNullOrEmpty(col.width)) {
                        var colWidth = multiStageLayout[name].colHeaderDiv.innerWidth();
                        if (colWidth > widths[col.name])
                            widths[col.name] = colWidth;
                    }
                    else {
                        widths[col.name] = parseInt(col.width, 10);
                    }
                }

                for (var name in multiStageLayout) {
                    var column = query.getColumn(name);
                    data.columnRules[name] = { rule: methods.addCssRule(data.id + " ." + column.safeName() + " { width: " + widths[name] + "px; }"), width: widths[name], dragWidth: column.dragWidth, colHeaderDiv: multiStageLayout[column.name].colHeaderDiv };
                    totalColWidths += Math.max(data.columnRules[name].outerWidth, widths[name]);
                }

                for (var name in multiStageLayout) {
                    data.columnRules[name].outerWidth = multiStageLayout[name].colHeaderDiv.outerWidth(true);
                    data.columnRules[name].offsetLeft = multiStageLayout[name].colHeaderDiv.offset().left - viewport.offset().left;
                    totalColWidths += Math.max(data.columnRules[name].outerWidth, widths[name]);
                }
            },

            addColumnSorting: function (columnDiv, columnSpan, isSorting) {
                if (isSorting != null) {
                    if (isSorting.endsWith(" DESC"))
                        columnSpan.addClass("sortDESC");
                    else
                        columnSpan.addClass("sortASC");
                }

                columnDiv.on("click", function (e) {
                    var dc = $(this).dataContext();
                    if (dc.column.disableSort == true)
                        return;

                    var appender = "ASC";
                    if (e.ctrlKey != true || isNullOrEmpty(query.sortOptions)) {
                        appender = (!query.sortOptions.contains(dc.column.name) || query.sortOptions.toLowerCase().endsWith(" desc") ? "ASC" : "DESC");
                        query.sortOptions = dc.column.name + " " + appender;
                    }
                    else {
                        var sortOptions = query.sortOptions.split(";").map(function (s) { return s.trim(); });
                        var existing = sortOptions.firstOrDefault(function (s) { return s == dc.column.name || s == dc.column.name + " ASC" || s == dc.column.name + " DESC"; });
                        if (existing != null) {
                            if (existing.endsWith(" DESC"))
                                sortOptions[sortOptions.indexOf(existing)] = dc.column.name;
                            else {
                                sortOptions[sortOptions.indexOf(existing)] = dc.column.name + " DESC";
                                appender = "DESC";
                            }
                        }
                        else
                            sortOptions.push(dc.column.name);

                        query.sortOptions = sortOptions.join(";");
                    }

                    query.top = query.top || query.pageSize;
                    if (query.pageSize > 0) {
                        while (query.top < rowCount)
                            query.top += query.pageSize;
                    }

                    query.search(function () {
                        methods.loadSettingsFromLocalStorage();

                        var querySettings = app.userSettings["QuerySettings"];
                        if (querySettings == null) {
                            querySettings = {};
                            app.userSettings["QuerySettings"] = querySettings;
                        }

                        if (querySettings[query.id] == null)
                            querySettings[query.id] = {};

                        querySettings[query.id].sortOptions = query.sortOptions;
                        methods.saveSettingsToLocalStorage();

                        if (viewport.scrollTop() == 0)
                            methods.syncData(0);
                        else
                            viewport.scrollTop(0);

                        if (e.ctrlKey != true)
                            header.find("span").removeClass("sortASC sortDESC");
                        else
                            dc.span.removeClass("sortASC sortDESC");
                        
                        if (query.sortOptions.contains(dc.column.name))
                            dc.span.addClass("sort" + appender);
                    });
                });
            },

            updatePendingSetCellContents: function (draggerOffsetCorrection) {
                for (var i = 0; i < rowCount; i++) {
                    for (var div in rows[i].contentDivs) {
                        if (rows[i].contentDivs[div].pendingSetCellContent != null) {
                            rows[i].contentDivs[div].pendingSetCellContent(draggerOffsetCorrection);
                        }
                    }
                }
            },

            setCellContent: function (row, col, item) {
                if (!col.isPinned && data.columnRules[col.name] != null) {
                    if (data.columnRules[col.name].offsetLeft > viewportWidth + query.queryGridSettings.scrollLeft ||
                        data.columnRules[col.name].offsetLeft + data.columnRules[col.name].width < query.queryGridSettings.scrollLeft + pinnedWidth) {
                        rows[row].contentDivs[col.name].pendingSetCellContent = function (draggerOffsetCorrection) {
                            if (draggerOffsetCorrection == null || draggerOffsetCorrection > 0)
                                draggerOffsetCorrection = 0;

                            if (data.columnRules[col.name].offsetLeft <= viewportWidth + query.queryGridSettings.scrollLeft - draggerOffsetCorrection &&
                                data.columnRules[col.name].offsetLeft + data.columnRules[col.name].width >= query.queryGridSettings.scrollLeft + pinnedWidth - draggerOffsetCorrection) {
                                col.render(item, rows[row].contentDivs[col.name]);
                                rows[row].contentDivs[col.name].pendingSetCellContent = null;
                            }
                        };

                        return;
                    }
                }

                rows[row].contentDivs[col.name].pendingSetCellContent = null;
                col.render(item, rows[row].contentDivs[col.name]);
            },

            setRowDataClass: function (tr, idx) {
                var dataClass = idx == null ? "noData" : "hasData";
                if (tr.dataClass != dataClass) {
                    tr.removeClass(idx == null ? "hasData" : "noData");
                    tr.addClass(dataClass);
                    tr.dataClass = dataClass;
                }
            },

            syncData: function (top, skipGetItems) {
                max = Math.max(viewport[0].scrollHeight - viewport.height(), 0); // This can be negative when there is a horizontal scrollbar, but no vertical
                var position = (max == 0) ? 0 : (top >= max ? 1 : 1 / max * top);
                if (isNaN(position) || position < 0)
                    position = 0;

                var visibleRows = Math.floor((dataTableContainer.innerHeight() - (scroller.outerWidth() > viewport.width() ? $.scrollbarWidth : 0)) / options.rowHeight);
                start = Math.floor((query.totalItems - visibleRows) * position);

                var columnsWithDivs = methods.getColumnsWithDivs();
                for (var r = 0; r < rowCount; r++) {
                    var idx = query.items[start + r] != null && data.columnRules != null ? start + r : null;
                    rows[r].idx = idx;

                    if (data.extraClasses.length > 0)
                        rows[r].tr.forEach(function (tr) { tr.removeClass(data.extraClasses.join(" ")); });

                    if (idx != null) {
                        var extraClass = query.items[start + r].getTypeHint("ExtraClass");
                        if (!isNullOrEmpty(extraClass)) {
                            data.extraClasses = data.extraClasses.concat(extraClass.split(" ")).distinct();
                            rows[r].tr.forEach(function (tr) { tr.addClass(extraClass); });
                        }
                    }
                    columnsWithDivs.forEach(function (col) {
                        if (idx == null) {
                            rows[r].contentDivs[col.name].empty();
                            col.removeExtraStyles(rows[r].contentDivs[col.name]);
                        }
                        else
                            methods.setCellContent(r, col, query.items[idx]);
                    });

                    rows[r].tr.forEach(function (tr) {
                        methods.setRowDataClass(tr, idx);
                    });
                }

                if (query.pageSize == 0) {
                    methods.onDataReceived();
                    return;
                }

                var length = rowCount * 2;
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
                    rootContainer.off("itemsChanged");
                    rootContainer.off("selectedItemsChanged");
                    return;
                }

                var widths = {};
                var calculateWidths = data.columnRules == null && query.hasSearched;
                if (calculateWidths)
                    data.columnRules = {};

                var columnsWithDivs = methods.getColumnsWithDivs();
                for (var r = 0; r < rowCount; r++) {
                    var idx = start + r;
                    var item = query.items[idx];
                    if (rows[r].idx == null && item != null) {
                        rows[r].idx = idx;
                        rows[r].tr.forEach(function (tr) {
                            methods.setRowDataClass(tr, idx);
                        });
                        if (data.extraClasses.length > 0)
                            rows[r].tr.forEach(function (tr) { tr.removeClass(data.extraClasses.join(" ")); });

                        var extraClass = item.getTypeHint("ExtraClass");
                        if (!isNullOrEmpty(extraClass)) {
                            data.extraClasses = data.extraClasses.concat(extraClass.split(" ")).distinct();
                            rows[r].tr.forEach(function (tr) { tr.addClass(extraClass); });
                        }

                        columnsWithDivs.forEach(function (col) {
                            methods.setCellContent(r, col, item);
                        });
                    }
                }

                if (query.hasTotalItem) {
                    if (totalContainerVisible != true)
                        methods.invalidateTotalRowVisibility();

                    for (var c in totals) {
                        var value = query.totalItem.getValue(c);
                        if (value != null)
                            totals[c].col.render(query.totalItem, totals[c].colTotalDiv);
                    }
                }

                if (calculateWidths) {
                    columnsWithDivs.forEach(function (col) {
                        var width = rows[0].contentDivs[col.name].innerWidth();
                        if (widths[col.name] == null || width > widths[col.name])
                            widths[col.name] = Math.round(width * 1.1);

                        if (query.hasTotalItem) {
                            var totalWidth = totals[col.name].colTotalDiv.innerWidth();
                            if (totalWidth > widths[col.name])
                                widths[col.name] = Math.round(totalWidth * 1.1);
                        }
                    });

                    methods.createColumns(widths);
                }

                methods.hover(null);
                methods.updateSelectedRowRules();
            },

            viewportMouseMove: function (e) {
                if (viewportOffset == null)
                    return;

                methods.hover(e.clientY - viewportOffset.top);
            },

            calculateSelectedColumn: function (e) {
                var clientX = e.clientX - dataSelectorWidth - viewportOffset.left;
                var x = clientX + (clientX < pinnedWidth ? 0 : (query.queryGridSettings != null ? query.queryGridSettings.scrollLeft || 0 : 0));

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
            },

            viewportClick: function (e) {
                if (e.ctrlKey == true)
                    return;

                if (app.isTablet)
                    methods.viewportMouseMove(e);

                if (currentRowHoverIdx >= 0) {
                    methods.calculateSelectedColumn(e);

                    var index = start + currentRowHoverIdx;
                    var selectedItem = query.items[index];

                    if (isNull(selectedItem))
                        return;

                    e = $.fixFireFoxOffset(e);
                    var left = e.offsetX - viewport.scrollLeft();
                    if (left > rowHeader.outerWidth())
                        query.onItemClicked(selectedItem, selectedColumn);
                    else {
                        var actionClicked = null;
                        var currentRow = rowHeader.find(".idx_" + currentRowHoverIdx);
                        var inlineActions = $.makeArray(currentRow.find(".inlineAction")).map(function (a) { return $(a).dataContext(); });
                        var selectorWidth = currentRow.find(".contentHolder").outerWidth();

                        if (left < selectorWidth) {
                            if (!options.hideSelector) {
                                var shiftKey = e.shiftKey;
                                var updateSelection = function (selectedItems) {
                                    if (shiftKey && !isNull(lastSelectedIndex)) {
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
                                }

                                if (query.allSelected) {
                                    query.allSelected = false;
                                    query.getItems(0, query.totalItems, function () {
                                        updateSelection(query.items.slice());
                                    })
                                }
                                else
                                    updateSelection((query.items.selectedItems() || []).slice());

                                lastSelectedIndex = index;
                            }
                            else {
                                if (inlineActions.length == 0)
                                    query.onItemClicked(selectedItem, selectedColumn);
                                else
                                    actionClicked = inlineActions[0];
                            }
                        }
                        else if (inlineActions.length > 0) {
                            left -= selectorWidth;
                            var actionWidth = $(currentRow.find(".inlineAction")[0]).outerWidth();
                            actionClicked = inlineActions[Math.floor(left / actionWidth)];
                        }
                        else
                            query.onItemClicked(selectedItem, selectedColumn);

                        if (actionClicked != null)
                            actionClicked.execute(null, null, null, [selectedItem]);
                    }
                }
                e.preventDefault();
                e.stopPropagation();
            },

            updateSelectedRowRules: function () {
                methods.updateSelectionIndicator();

                if (query.allSelected) {
                    // NOTE: Optimized to just select all items
                    $.each(rows, function (i, rowData) {
                        if (query.items[start + i] != null) {
                            if (rowData.row.selected != true) {
                                rowData.row.selected = true;
                                rowData.row.addClass("selected");
                                if (rowData.pinnedRow != null) rowData.pinnedRow.addClass("selected");
                                rowData.selector.addClass("selected");
                            }
                        }
                        else if (rowData.row.selected == true) {
                            rowData.row.selected = false;
                            rowData.row.removeClass("selected");
                            if (rowData.pinnedRow != null) rowData.pinnedRow.removeClass("selected");
                            rowData.selector.removeClass("selected");
                        }
                    });
                    return;
                }

                var selectedItems = query.items.selectedItems() || [];
                var selectedIndexes = [];
                selectedItems.forEach(function (item) {
                    var idx = query.items.indexOf(item) - start;
                    if (idx >= 0 && idx < rowCount)
                        selectedIndexes.push(idx);
                });

                $.each(rows, function (i, rowData) {
                    if (selectedIndexes.contains(i)) {
                        if (rowData.row.selected != true) {
                            rowData.row.selected = true;
                            rowData.row.addClass("selected");
                            if (rowData.pinnedRow != null) rowData.pinnedRow.addClass("selected");
                            rowData.selector.addClass("selected");
                        }
                    }
                    else if (rowData.row.selected == true) {
                        rowData.row.selected = false;
                        rowData.row.removeClass("selected");
                        if (rowData.pinnedRow != null) rowData.pinnedRow.removeClass("selected");
                        rowData.selector.removeClass("selected");
                    }
                });
            },

            addCssRule: function (css) {
                return $.rule(css).appendTo("style");
            },

            hover: function (y) {
                var index = y != null ? Math.floor(y / options.rowHeight) : currentRowHoverIdx;

                if (y != null && query.hasTotalItem && dataContainer.innerHeight() < y) {
                    methods.removeHoverRule();
                    currentRowHoverIdx = -1;
                    return;
                }

                if (index != currentRowHoverIdx || scroller.hasCursor != true || y == null) /* Check via data instead of css to skip layout pass */ {
                    currentRowHoverIdx = index;

                    methods.removeHoverRule();

                    if (rows[index] != null && rows[index].idx != null) {
                        rows[index].row.hasHover = true;
                        rows[index].row.addClass("hover");

                        if (rows[index].pinnedRow != null) rows[index].pinnedRow.addClass("hover");
                        rows[index].selector.addClass("hover");

                        scroller.css("cursor", "pointer");
                        scroller.hasCursor = true;

                        if (!app.isTablet && query.canRead)
                            scroller.data("href", "#!/" + app.getUrlForPersistentObject({ id: q.persistentObject.id, objectId: query.items[start + currentRowHoverIdx].id }));
                    }
                }
                else if (rows[index] != null && rows[index].idx == null)
                    methods.removeHoverRule();
            },

            removeHoverRule: function () {
                rows.forEach(function (row) {
                    if (row.row.hasHover == true) {
                        row.row.hasHover = false;

                        row.row.removeClass("hover");
                        if (row.pinnedRow != null) row.pinnedRow.removeClass("hover");
                        row.selector.removeClass("hover");
                    }
                });

                if (!app.isTablet && query.canRead)
                    scroller.data("href", null);

                scroller.css("cursor", "default");
                scroller.hasCursor = false;
            },

            getColumnsData: function () {
                var columnsData = [];
                query.columns.filter(function (c) { return c.isPinned == true && c.width != 0; }).orderBy("offset").forEach(function (c) {
                    columnsData.push({ name: c.name, label: c.label, isHidden: c.isHidden, offset: c.offset, isPinned: true });
                });

                query.columns.filter(function (c) { return c.isPinned != true && c.width != 0; }).orderBy("offset").forEach(function (c) {
                    columnsData.push({ name: c.name, label: c.label, isHidden: c.isHidden, offset: c.offset, isPinned: false });
                });

                return columnsData;
            },

            toggleManagement: function () {
                var overlay = $("<div>").addClass("managementDialogOverlay").css({ position: "absolute", top: "0", left: "0", right: "0", bottom: "0" });
                container.append(overlay);

                var mgmtContainer = $("<div>").addClass("managementDialogContainer").css({ position: "absolute", top: "0", left: "0", right: "0", bottom: "0" });
                container.append(mgmtContainer);

                var managementDialog = $("<div>").addClass("managementDialog").css({ position: "relative" });
                managementDialog.width(Math.min(500, overlay.innerWidth() * 0.45));
                var dialogHeight = Math.min(mgmtContainer.innerHeight(), 300);
                managementDialog.height(dialogHeight);
                managementDialog.css({ "margin-top": (mgmtContainer.innerHeight() / 2 - dialogHeight / 2) + "px" });

                mgmtContainer.on("resize", function () {
                    managementDialog.height(Math.min(mgmtContainer.innerHeight(), 300));
                    managementDialog.css({ "margin-top": (mgmtContainer.innerHeight() / 2 - managementDialog.height() / 2) + "px" });
                });

                var dialogHeader = $("<div>").addClass("managementHeader").text(query.label);
                managementDialog.append(dialogHeader);
                var footer = $("<div>").addClass("managementFooter").css({ bottom: "0", left: "0", right: "0", position: "absolute" });
                managementDialog.append(footer);

                var cancel = $("<div>").text(app.getTranslatedMessage("Cancel")).css({ 'float': "right" });
                cancel.on("click", function () {
                    mgmtContainer.remove();
                    overlay.remove();
                });
                footer.append(cancel);

                var save = $("<div>").text(app.getTranslatedMessage("Save")).css({ 'float': "right" });
                footer.append(save);

                var reset = $("<div>").text(app.getTranslatedMessage("Reset")).css({ 'float': "left" });
                footer.append(reset);
                reset.on("click", function () {
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

                var mgmtTableContainer = $.createElement("div").css({ overflow: "auto", top: dialogHeader.outerHeight(true) + "px", left: "0", right: "0", bottom: footer.outerHeight(true) + "px", position: "absolute" });
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

                var columnsData = methods.getColumnsData();
                methods.updateManagementRows(columnsData, mgmtTableBody);

                save.on("click", function () {
                    methods.saveSettingsToLocalStorage(columnsData);

                    mgmtContainer.remove();
                    overlay.remove();

                    methods.create();
                });
            },

            updateManagementRows: function (columnsData, target) {
                target.empty();

                var newColumnsData = [];
                columnsData.filter(function (c) { return c.isPinned; }).orderBy("offset").forEach(function (c) {
                    newColumnsData.push(c);
                });
                columnsData.filter(function (c) { return !c.isPinned; }).orderBy("offset").forEach(function (c) {
                    newColumnsData.push(c);
                });
                columnsData.splice(0, columnsData.length);
                newColumnsData.forEach(function (c) { columnsData.push(c); });

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
                    moveUp.on("click", function () {
                        var temp = previousCol.offset;
                        previousCol.offset = col.offset;
                        col.offset = temp;

                        methods.updateManagementRows(columnsData, target);
                    });
                }

                var moveDown = $("<div>").addClass("iconColumn");
                if (nextCol != null && nextCol.isPinned == col.isPinned) {
                    moveDown.addClass("moveDown");
                    moveDown.on("click", function () {
                        var temp = nextCol.offset;
                        nextCol.offset = col.offset;
                        col.offset = temp;

                        methods.updateManagementRows(columnsData, target);
                    });
                }

                var isPinned = $("<div>").addClass("iconColumn isPinned");
                if (col.isPinned)
                    isPinned.addClass("checked");

                isPinned.on("click", function () {
                    col.isPinned = !col.isPinned;
                    $(this).toggleClass("checked");
                    methods.updateManagementRows(columnsData, target);
                });

                var isVisible = $("<div>").addClass("iconColumn isVisible");
                if (col.isHidden != true)
                    isVisible.addClass("checked");

                isVisible.on("click", function () {
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
                var settings = app.userSettings["QueryGridSettings"];
                if (settings != null) {
                    if (settings[query.id] != null) {
                        delete settings[query.id];

                        query.columns.filter(function (c) { return c._backup != null; }).forEach(function (c) {
                            copyProperties(c._backup, ["offset", "isPinned", "isHidden", "dragWidth", "width"], true, c);
                            delete c._backup;
                        });

                        app.saveUserSettings();
                    }
                }
            },

            loadSettingsFromLocalStorage: function () {
                var settings = app.userSettings["QueryGridSettings"];
                if (settings == null) {
                    settings = {};
                    app.userSettings["QueryGridSettings"] = settings;
                }
                else if (typeof (settings) == "string") {
                    settings = JSON.parse(settings);
                    app.userSettings["QueryGridSettings"] = settings;
                }

                if (settings[query.id] == null)
                    settings[query.id] = {};

                query.columns.filter(function (c) { return c.width != 0; }).orderBy("offset").forEach(function (c) {
                    var setting = settings[query.id][c.name];
                    if (setting == null)
                        return;

                    c._backup = copyProperties(c, ["offset", "isPinned", "isHidden", "dragWidth", "width"], true);

                    c.offset = setting.offset;
                    c.isPinned = setting.isPinned;
                    c.isHidden = setting.isHidden;
                    c.dragWidth = setting.dragWidth;
                    if (!isNullOrEmpty(setting.dragWidth))
                        c.width = setting.dragWidth;
                });

                return settings[query.id];
            },

            saveSettingsToLocalStorage: function (columnsData) {
                var settings = app.userSettings["QueryGridSettings"];
                if (settings == null) {
                    settings = {};
                    app.userSettings["QueryGridSettings"] = settings;
                }
                else if (typeof (settings) == "string") {
                    settings = JSON.parse(settings);
                    app.userSettings["QueryGridSettings"] = settings;
                }

                if (settings[query.id] == null)
                    settings[query.id] = {};

                columnsData = columnsData || methods.getColumnsData();
                columnsData.forEach(function (column) {
                    var cr = data.columnRules[column.name];
                    settings[query.id][column.name] = { offset: column.offset, isPinned: column.isPinned, isHidden: column.isHidden, dragWidth: cr != null ? cr.dragWidth : null };
                });

                app.saveUserSettings();
            },

            updateSelectionIndicator: function () {
                if (headerSelector == null)
                    return;

                if (query.allSelected) {
                    headerSelector.removeClass("semiselected");
                    headerSelector.addClass("selected");
                }
                else {
                    var selectedCount = (query.items.selectedItems() || []).length;
                    if (selectedCount == 0) {
                        headerSelector.removeClass("semiselected selected");
                    }
                    else if (selectedCount == query.totalItems) {
                        headerSelector.removeClass("semiselected");
                        headerSelector.addClass("selected");
                    }
                    else {
                        headerSelector.removeClass("selected");
                        headerSelector.addClass("semiselected");
                    }
                }
            }
        };

        options = options || {};
        if (options.rowHeight == null) {
            options.rowHeight = 30;
            methods.getColumnsWithDivs().forEach(function (c) {
                options.rowHeight = Math.max(options.rowHeight, parseInt(c.getTypeHint("RowHeight", "0").replace("px", ""), 10));
            });
        }

        methods.create();
    };
})(jQuery);