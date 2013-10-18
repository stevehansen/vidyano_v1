(function ($) {
    $.fn.profiler = function (action, data) {
        var lastProfiledRequest, counts;
        var profiler = $("#profiler");

        if (action == "enable") {
            if (this.hasClass("enabled"))
                return;
            
            this.addClass("enabled");

            lastProfiledRequest = $("<div class='lastProfiledRequest'>").text("Awaiting next request...");
            var recentProfiledRequests = $("<div class='recentProfiledRequests'>");
            var requests = $("<div class='requests'>");
            var requestDetails = $("<div class='requestDetails'>");

            profiler.append(lastProfiledRequest, recentProfiledRequests.append(requests, $("<div class='requestDetailsContainer'>").append(requestDetails)));

            profiler.data("requestsQuery", requests.jsonGrid({
                source: [],
                renderOptions: [
                    { label: "", propertyName: "hasWarnings", type: "Image", width: "30px", typeHints: { "Width": "30", "Height": "30"} },
                    { label: "When?", propertyName: "when", type: "DateTime", width: "90px", typeHints: { "DisplayFormat": "{0:HH:mm:ss}" } },
                    { label: "Method", propertyName: "method", type: "String", width: "150px" },
                    { label: "Parameters", propertyName: "parameters", type: "String", width: "200px" },
                    { label: "Server", propertyName: "server", type: "String", width: "90px" },
                    { label: "Transport", propertyName: "transport", type: "String", width: "90px" },
                    { label: "#SQL", propertyName: "sharpsql", type: "String", width: "90px" }
                ],
                onItemClicked: function (item) {
                    this.updateSelectedItems([item]);

                    profiler.data("requests").forEach(function (r) { r.isSelected = r == item; });
                },
                onSelectedItemsChanged: function (items) {
                    if (items.length == 1) {
                        var selectedRequest = profiler.data("requests").firstOrDefault(function (r) { return r.id == items[0].id; });
                        var currentItem = requestDetails.data("currentItem");
                        if (currentItem != selectedRequest) {
                            requestDetails.data("currentItem", selectedRequest);
                            requestDetails.profiler("updateDetails", selectedRequest);
                        }
                    }
                    else {
                        var q = profiler.data("requestsQuery");
                        q.items.selectedItems([q.items.slice(-1)[0]]);
                    }
                }
            }));

            profiler.on("click", function (e) {
                if (!profiler.hasClass("expanded")) {
                    var req = profiler.data("requests");
                    if (req != null && req.length > 0) {
                        var q = profiler.data("requestsQuery");
                        if ((q.items.selectedItems() || []).length == 0) {
                            q.items.selectedItems([q.items[0]]);
                        }

                        profiler.addClass("expanded");

                        $(window).one("click", function () {
                            profiler.removeClass("expanded");
                        });
                    }
                }

                e.preventDefault();
                e.stopPropagation();
            });

            requests.on("mouseleave", function () {
                requests.find(".queryGrid .hover").removeClass("hover");
            });

            requestDetails.profiler("updateDetails", null);
        }
        if (action == "disable") {
            this.removeClass("enabled");
            profiler.empty();
            profiler.off("click");
        }
        else if (action == "start") {
            $("#rootContainer").addClass("profiling");
            profiler.data("requests", []);
        }
        else if (action == "stop") {
            $("#rootContainer").removeClass("profiling");
            profiler.data("requests", []);
            profiler.find(".lastProfiledRequest").empty().text("Awaiting next request...");
        }
        else if (action == "update") {
            var extra = {};

            if (data.method == "GetPersistentObject") {
                if (data.response.result.id == "b15730ad-9f47-4775-aacb-0a181e95e53d" || data.response.result.isSystem)
                    return;

                extra["Type"] = data.response.result.type;
                extra["Id"] = data.response.result.objectId;
            }
            else if (data.method == "GetQuery") {
                if (data.response.query.isSystem)
                    return;

                extra["Name"] = data.response.query.name;
            }
            else if (data.method == "ExecuteAction") {
                if ((data.response.result != null && (data.response.result.id == "b15730ad-9f47-4775-aacb-0a181e95e53d" || data.response.result.isSystem) || (data.request.query != null && data.request.query.isSystem) || (data.request.parent != null && data.request.parent.isSystem)))
                    return;

                extra["Name"] = data.request.action;
            }
            else if (data.method == "ExecuteQuery") {
                if (data.request.query.isSystem)
                    return;

                extra["Name"] = data.request.query.name;
                extra["PageSize"] = data.request.query.pageSize;
                if (data.request.query.top)
                    extra["Top"] = data.request.query.top;
                if (data.request.query.skip)
                    extra["Skip"] = data.request.query.skip;
            }

            lastProfiledRequest = profiler.find(".lastProfiledRequest");
            lastProfiledRequest.empty();

            var createRequestPart = function (title, text) {
                var lastProfiledRequestPart = $("<div class='lastProfiledRequestPart'>");
                lastProfiledRequestPart.append($("<span class='partName'>").text(title));
                lastProfiledRequestPart.append($("<span class='partText'>").text(text));

                lastProfiledRequest.append(lastProfiledRequestPart);
            };

            createRequestPart("Method", data.method);
            var parameters = "";
            if (extra) {
                for (var extraName in extra) {
                    if (parameters != "")
                        parameters += ", ";

                    parameters += extra[extraName];
                    createRequestPart(extraName, extra[extraName]);
                }
            }
            createRequestPart("Server", Math.round(data.profiler.elapsedMilliseconds) + "ms");
            createRequestPart("Transport", Math.round(data.transport) + "ms");

            var detectWarnings = function (entries) {
                entries.forEach(function (entry) {
                    // Detect N+1
                    counts = _.countBy(entry.sql, function (commandId) { return data.profiler.sql.firstOrDefault(function (s) { return s.commandId == commandId; }).commandText; });
                    for (var count in counts) {
                        if (counts[count] > 1) {
                            data.profiler.hasWarnings = true;
                            entry.hasNPlusOne = true;
                        }
                    }

                    if (entry.entries && entry.entries.length > 0)
                        detectWarnings(entry.entries);
                });
            };

            detectWarnings(data.profiler.entries);
            if (data.profiler.exceptions && data.profiler.exceptions.length > 0)
                data.profiler.hasWarnings = true;

            requests = profiler.data("requests");
            requests.push({
                id: getRandom(),
                when: ServiceGateway.toServiceString(data.when, "DateTime"),
                method: data.method,
                parameters: "(" + parameters + ")",
                server: Math.round(data.profiler.elapsedMilliseconds) + "ms",
                transport: Math.round(data.transport) + "ms",
                profiler: data.profiler,
                hasWarnings: data.profiler.hasWarnings ? "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABTAAAAUwBaYa9OQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKISURBVEiJ7ZbfS1NhHMafs3czdIII5gwvDL0JgrCLbiLN/0DL/oPwJggHlU7DCFIRQcuuK7vW/NHlcsicdTMhQ4NSWVMC8YhTdGOHufO+Tzdq2RbzzIUIPnDg8D4vz+f9vue8PzSSOAnZToR6Bj4NYA1AE4B7e+/WRTKbx8PfassmQ8tiOZVRypA+OlYApeC60xjXhKgCsPa/K34tEwkZqKhkoKKSKpGQJF9ZzbEKvaqUUj+6uumFoBeCoc4uUilFsvq/gZVpTid03fQVFh2AfYVFTOi6SdMMWMmy8lc3akLcWPK0CxmLHTTKWAyLrW0CQtQAuJ3rb3xOmebKzuwX+cHm4GRxCTcmfNyY8HGyuIRezc6dz7NS7e6ukMzL5VS3kmSwto5eCPrLyg/Wkr+snF4IBmtu7je15GqqXVCqY31klFuB6X922pr+CP3dCCjlEwClmUKPAu6klPkLj1oz7lCLLR5AqXwAz44LriZ5d7mv32aEwxlHaITDWO7rt4FsAnAlazClHEhGIirc3ZMRuq9wdw+SkYiClAPZgm9pQtQutT0WZjR6yJCGgbWhYawNDUMaxiHPjEax6GkXEKIOQL1VcB6lfB6bm5erbwZTXaUg43HIeBxQKsVeHXyL6Ny8YjL5AkCeFbBbE6Lie7NbME2wcDrhaqiHq6EewulM8akUFprdNs3huAjg/lHBpVCqY338PTf9U2lHJQ0D28EZbAdnUqZ6X5v+Kehj46CUTwGU/O2nOxZ7aZoPPl26bIuHQmlDj6qCqipc//aVNofjJQD3n549Tf8L0DTt2tRk8ljUPWl2uwNpNpR0FRcBeAjgfC7AAH4C6AVwqJBsbiA50am7ZZ6BLesXm5TlWBFDkl8AAAAASUVORK5CYII=" : "",
                sharpsql: data.profiler.sql ? data.profiler.sql.length : 0
            });

            profiler.data("requests", requests.orderByDescending(function (o) { return o.when; }).slice(0, 10));
            profiler.data("requestsQuery").refreshItems(profiler.data("requests"));
        }
        else if (action == "updateDetails") {
            var details = profiler.find(".requestDetails");
            if (data == null)
                details.hide();
            else {
                details.empty();
                details.show();

                var timeline = $("<div class='timeline'>");
                var timelineContainer = $("<div class='timelineContainer'>");
                var entryInfo = $("<div class='entryInfo'>").hide();
                details.append(timelineContainer.append(timeline)).append(entryInfo);

                var width = timelineContainer.innerWidth();
                timeline.css("width", width + "px");
                var scale = width / data.profiler.elapsedMilliseconds;
                var initialScale = scale;

                var updateTimelineBars = function (scrollLeft, total) {
                    var timelineBarsWidth = timelineContainer.width();

                    var minGridSlicePx = 50; // = minimal distance between grid lines.
                    var dividersElementClientWidth = total;
                    var dividersCount = dividersElementClientWidth / minGridSlicePx;
                    var gridSliceTime = timelineBarsWidth / dividersCount;
                    var pixelsPerTime = dividersElementClientWidth / timelineBarsWidth;

                    var logGridSliceTime = Math.ceil(Math.log(gridSliceTime) / Math.log(10));
                    gridSliceTime = Math.pow(10, logGridSliceTime);
                    if (gridSliceTime * pixelsPerTime >= 5 * minGridSlicePx)
                        gridSliceTime = gridSliceTime / 5;
                    if (gridSliceTime * pixelsPerTime >= 2 * minGridSlicePx)
                        gridSliceTime = gridSliceTime / 2;

                    var firstDividerTime = Math.ceil(scrollLeft / gridSliceTime) * gridSliceTime;
                    var lastDividerTime = scrollLeft + timelineBarsWidth;
                    dividersCount = Math.ceil((lastDividerTime - firstDividerTime) / gridSliceTime);
                    var timeToPixel = total / timelineBarsWidth;

                    timeline.find(".divider").remove();
                    for (var i = 0; i < dividersCount; ++i) {
                        var time = firstDividerTime + gridSliceTime * i;
                        var left = (time - scrollLeft) * timeToPixel;

                        var divider = $("<div class='divider'>").css({
                            "left": left + "px",
                            "top": ($.scrollbarHeight + 5) + "px",
                        });
                        if (i < dividersCount - 1)
                            divider.text(Math.floor((left / total) * data.profiler.elapsedMilliseconds) + "ms");

                        timeline.append(divider);
                    }
                };

                updateTimelineBars(0, width);

                var originalPageX = -2;
                var originalPercentageMousePosition = -2;
                timelineContainer.on('mousewheel DOMMouseScroll MozMousePixelScroll', function (event) {
                    entryInfo.empty();

                    var up = (event.originalEvent.wheelDelta || (event.originalEvent.detail * -1)) > 0;
                    scale = up ? scale * 1.1 : scale / 1.1;
                    if (scale < initialScale)
                        scale = initialScale;

                    var newWidth = scale * data.profiler.elapsedMilliseconds;

                    var tlWidth = timeline.outerWidth();

                    var percentageMousePosition;
                    var eventPageX = event.originalEvent.pageX;
                    var mouseXContainer = eventPageX - timelineContainer.offset().left;
                    if (Math.abs(originalPageX - eventPageX) > 1) {
                        var mouseX = eventPageX - timeline.offset().left;
                        percentageMousePosition = mouseX / tlWidth;
                        originalPercentageMousePosition = percentageMousePosition;
                    }
                    else
                        percentageMousePosition = originalPercentageMousePosition;

                    timeline.find(":not(.entry)").remove();
                    timeline.css("width", (newWidth) + "px");
                    timelineContainer.scrollTop(timeline.innerHeight());

                    var newInnerWidth = timeline.outerWidth();
                    var newScrollLeft = ((newInnerWidth) * percentageMousePosition) - (mouseXContainer);

                    updateTimelineBars(newScrollLeft, newWidth);
                    plotEntries(data.profiler.entries, 0);

                    timelineContainer.scrollLeft(newScrollLeft);
                });

                var barHeight = 30;
                var minHeight = barHeight;
                var plotEntries = function (entries, bottom) {
                    if (bottom + barHeight > minHeight)
                        minHeight = bottom + barHeight;

                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var entryDiv = null;

                        if (entry.id)
                            entryDiv = timeline.find("#" + entry.id);

                        if (entryDiv != null && entryDiv.length > 0) {
                            entryDiv.css({
                                left: (entry.started * scale) + "px",
                                width: Math.max((entry.elapsedMilliseconds * scale), 1) + "px",
                            });
                        }
                        else {
                            entry.id = _.uniqueId("entry_");
                            entryDiv = $("<div class='entry'>").attr("id", entry.id).data("entry", entry).text(entry.methodName.split('.').last());
                            entryDiv.css({
                                bottom: bottom + "px",
                                left: (entry.started * scale) + "px",
                                width: Math.max((entry.elapsedMilliseconds * scale), 1) + "px",
                                height: barHeight + "px",
                                "line-height": barHeight + "px",
                            });

                            timeline.append(entryDiv);
                            entryDiv.on("mouseenter", function () {
                                entry = $(this).data("entry");

                                var table = $("<table>");
                                table.append($("<tr><td>Method</td><td>" + entry.methodName + "</td></tr"));
                                table.append($("<tr><td>Total time</td><td>" + entry.elapsedMilliseconds.toFixed(2) + "ms</td></tr"));
                                table.append($("<tr><td>SQL statements</td><td>" + entry.sql.length + (entry.hasNPlusOne ? " (Possible N+1 detected)" : "") + "</td></tr"));

                                entryInfo.empty();
                                entryInfo.append(table);
                                entryInfo.show();
                            });
                            entryDiv.on("mouseleave", function () {
                                entryInfo.hide();
                                entryInfo.empty();
                            });
                            if ((!entry.arguments || entry.arguments.length == 0) &&
                                entry.sql.length == 0 && !entry.exception) {
                                entryDiv.addClass("noDetails");
                            }
                            else {
                                if (entry.sql.length > 0) {
                                    entryDiv.addClass("hasSql");

                                    if (entry.hasNPlusOne)
                                        entryDiv.addClass("hasNPlusOne");
                                }

                                if (entry.exception)
                                    entryDiv.addClass("hasException");

                                entryDiv.on("click", function () {
                                    entry = $(this).data("entry");

                                    var fullRequestDetailsHeader = $("<div class='fullRequestDetailsHeader'>").text(entry.methodName);
                                    var fullRequestDetails = $("<div class='fullRequestDetails'>");
                                    var closeFullRequestDetails = $("<div class='close'>");
                                    closeFullRequestDetails.on("click", function () {
                                        fullRequestDetails.remove();
                                        fullRequestDetailsHeader.remove();
                                        closeFullRequestDetails.remove();
                                    });

                                    if (entry.arguments && entry.arguments.length > 0) {
                                        fullRequestDetails.append($("<div class='topic'>").text("Arguments"));

                                        var argumentNames = entry.methodName.replace(")", "").split("(")[1].split(", ");

                                        var table = $("<table class='arguments'>");
                                        for (var j = 0; j < argumentNames.length; j++) {
                                            var tr = $("<tr>");
                                            tr.append($("<td>").text(argumentNames[j]));

                                            if (typeof (entry.arguments[j]) == "object") {
                                                var first = true;
                                                for (var p in entry.arguments[j]) {
                                                    if (!first) {
                                                        table.append(tr);
                                                        tr = $("<tr>").append($("<td>"));
                                                    }

                                                    first = false;

                                                    tr.append($("<td>").text(p));
                                                    tr.append($("<td>").text(entry.arguments[j][p]));
                                                }
                                            }
                                            else
                                                tr.append($("<td colspan=2>").text(entry.arguments[j]));

                                            table.append(tr);
                                        }

                                        fullRequestDetails.append(table);
                                    }

                                    if (entry.sql.length > 0) {
                                        fullRequestDetails.append($("<div class='topic'>").text("SQL Statements"));

                                        counts = _.countBy(entry.sql, function (commandId) { return data.profiler.sql.firstOrDefault(function (s) { return s.commandId == commandId; }).commandText; });
                                        entry.sql.forEach(function (commandId) {
                                            var sql = data.profiler.sql.firstOrDefault(function (s) { return s.commandId == commandId; });
                                            table = $("<table class='sqlStatement'>");
                                            table.append($("<tr><td>CommandText</td><td><pre>" + sql.commandText + "</pre></td></tr"));

                                            if (sql.parameters && sql.parameters.length > 0) {
                                                var parametersTableTr = $("<tr>").append($("<td>Parameters</td>"));
                                                table.append(parametersTableTr);
                                                var parametersTableTd = $("<td>");
                                                parametersTableTr.append(parametersTableTd);

                                                var parametersTable = $("<table>");
                                                sql.parameters.forEach(function (param) {
                                                    parametersTable.append($("<tr><td>" + param.name + "</td><td>" + param.value + "</td><td>" + param.type + "</td></tr"));
                                                });

                                                parametersTableTd.append(parametersTable);
                                            }

                                            if (sql.recordsAffected >= 0)
                                                table.append($("<tr><td>Records affected</td><td>" + sql.recordsAffected + "</td></tr"));
                                            if (sql.elapsedMilliseconds)
                                                table.append($("<tr><td>Total time</td><td>" + sql.elapsedMilliseconds.toFixed(2) + "ms</td></tr"));
                                            if (entry.taskId != sql.taskId)
                                                table.append($("<tr><td>Task id</td><td>" + sql.taskId + "</td></tr"));

                                            if (counts[sql.commandText] > 1)
                                                table.append($("<tr><td>Warnings</td><td>Possible N+1 detected</td></tr"));

                                            fullRequestDetails.append(table);
                                        });
                                    }

                                    if (entry.exception) {
                                        fullRequestDetails.append($("<div class='topic'>").text("Exception"));

                                        var exception = data.profiler.exceptions.firstOrDefault(function (e) { return e.id == entry.exception; });
                                        fullRequestDetails.append($("<pre class='entryException'>").text(exception.message));
                                    }

                                    details.append(fullRequestDetailsHeader, fullRequestDetails, closeFullRequestDetails);
                                });
                            }
                        }

                        if (entry.entries && entry.entries.length > 0)
                            plotEntries(entry.entries, bottom + barHeight);
                    }
                };

                plotEntries(data.profiler.entries, 0);
                timeline.css("height", timelineContainer.innerHeight() + "px");
            }
        }
    };
})(jQuery);