(function ($) {
    $.fn.weekScheduler = function () {
        $(this).each(function () {
            var functions = {
                createInfoBar: function () {
                    infoBar = $.createElement("div");
                    displayValueLabel = $.createElement("label");

                    var displayValueDiv = $.createElement("div");
                    var lowDiv = $.createElement("div");
                    var lowDisplayDiv = $.createElement("div");
                    var lowLabel = $.createElement("label");
                    var highDiv = $.createElement("div");
                    var highDisplayDiv = $.createElement("div");
                    var highLabel = $.createElement("label");

                    lowDisplayDiv.addClass("weekSchedulerLowLoad");
                    lowLabel.text("Low load");
                    lowDiv.addClass("weekSchedulerLegendPart")
                        .append(lowDisplayDiv, lowLabel);
                    highDisplayDiv.addClass("weekSchedulerHighLoad");
                    highLabel.text("High load");
                    highDiv.addClass("weekSchedulerLegendPart")
                        .append(highDisplayDiv, highLabel);
                    displayValueLabel.addClass("weekSchedulerValueLabel");
                    displayValueDiv.addClass("weekSchedulerLegendPart")
                        .append(displayValueLabel);
                    infoBar.addClass("weekSchedulerLegend")
                        .width(table.outerWidth())
                        .append(highDiv, lowDiv, displayValueDiv);
                    root.append(infoBar);
                },

                createScheduler: function () {
                    table = $.createElement("table").addClass("weekSchedulerGrid");
                    var tbody = $.createElement("tbody");
                    var days = functions.getDaysSorted();

                    days.run(function (day) {
                        var tr = $.createElement("tr");
                        var dayTd = $.createElement("td");

                        dayTd.addClass("weekSchedulerGridDayCell")
                            .append(day);
                        tr.attr("id", day)
                            .append(dayTd);

                        hours.run(function (hour) {
                            var td = $.createElement("td");
                            var div = $.createElement("div");

                            div.dataContext({ cellDay: day, cellHour: hour })
                                .addClass("weekSchedulerGridCellSelector")
                                .addClass("selected")
                                .on("mousedown", eventFunctions.onSelectorMouseDown)
                                .on("mouseenter", eventFunctions.onSelectorMouseEnter);
                            td.addClass("weekSchedulerGridHourCell")
                                .append(div);
                            tr.append(td);
                        });

                        tbody.append(tr);
                    });

                    table.append(tbody)
                        .on("mouseleave", eventFunctions.onTableMouseLeave);
                    root.append(table);
                },

                getDaysSorted: function () {
                    if (firstDayOfWeek != 0) {
                        var temp = new Array();
                        jQuery.extend(temp, minDaysOfWeek);
                        var splice = temp.splice(0, firstDayOfWeek);

                        for (var i = splice.length; i > 0; i--) {
                            temp.push(splice[i - 1]);
                        }

                        return temp;
                    }

                    return minDaysOfWeek;
                },

                getHours: function () {
                    var h = new Array();

                    for (var i = 0; i < 24; i++) {
                        h[i] = i;
                    }

                    return h;
                },

                setDisplayValue: function (selector) {
                    if (selector != null) {
                        var dataContext = selector.dataContext();
                        var indexOfDay = minDaysOfWeek.indexOf(dataContext.cellDay);

                        displayValueLabel.text(daysOfWeek[indexOfDay] + ", " + dataContext.cellHour + ":00" + " - " + dataContext.cellHour + ":59");
                    } else {
                        displayValueLabel.text("");
                    }
                },

                setSelectorsFromData: function () {
                    if (data == null)
                        return;

                    var temp = data;
                    minDaysOfWeek.run(function (day) {
                        var cells = table.find("tr[id='" + day + "'] td");

                        cells.each(function () {
                            var cell = $(this);
                            var selector = cell.find(".weekSchedulerGridCellSelector");

                            if (selector.length != 0) {
                                var value = temp.substring(0, 1);

                                temp = temp.substring(1, temp.length);

                                if (value != "1") {
                                    selector.removeClass("selected");
                                }
                            }
                        });
                    });
                },

                toggleSelectorClass: function (selector) {
                    var prev = selector.hasClass("selected");

                    if (isToggleOn) {
                        selector.addClass("selected");
                    } else {
                        selector.removeClass("selected");
                    }

                    if (prev != selector.hasClass("selected")) {
                        functions.updateData();
                    }
                },

                updateData: function () {
                    data = new Array();

                    minDaysOfWeek.run(function (day) {
                        var cells = table.find("tr[id='" + day + "'] td");

                        cells.each(function () {
                            var cell = $(this);
                            var selector = cell.find(".weekSchedulerGridCellSelector");

                            if (selector.length != 0) {
                                data.push(selector.hasClass("selected") ? 1 : 0);
                            }
                        });
                    });

                    data = data.join("");

                    attribute.onChanged({ value: data }, true);
                }
            };

            var eventFunctions = {
                onTableMouseLeave: function () {
                    functions.setDisplayValue();
                },

                onSelectorMouseDown: function () {
                    var selector = $(this);

                    isDragging = true;
                    isToggleOn = !selector.hasClass("selected");

                    functions.toggleSelectorClass(selector);

                    $(document).on("mouseup.weekScheduler", eventFunctions.onSelectorMouseUp);
                },

                onSelectorMouseEnter: function () {
                    var selector = $(this);

                    functions.setDisplayValue(selector);

                    if (isDragging) {
                        functions.toggleSelectorClass(selector);
                    }
                },

                onSelectorMouseUp: function () {
                    isDragging = false;
                    $(document).off("mouseup.weekScheduler");
                }
            };

            var root = $(this);
            var currentCultureDateFormat = CultureInfo.currentCulture.dateFormat;
            var daysOfWeek = currentCultureDateFormat.dayNames;
            var minDaysOfWeek = currentCultureDateFormat.minimizedDayNames;
            var firstDayOfWeek = currentCultureDateFormat.firstDayOfWeek;
            var hours = functions.getHours();
            var isToggleOn = false;
            var isDragging = false;
            var infoBar;
            var displayValueLabel;
            var table;
            var attribute = root.dataContext().getAttribute("HighLowSchedule");
            var data = attribute.value;

            root.empty();
            root.disableSelection();
            functions.createScheduler();
            functions.createInfoBar();
            functions.setSelectorsFromData();
            root.parent().width(table.outerWidth());
        });
    };
})(jQuery);