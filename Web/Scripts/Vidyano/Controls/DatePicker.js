(function ($) {
    if (app.isMobile) {
        $.fn.datepicker = function (action) {
            var $this = $(this);
            var targetInput = $this.data("target");
            if (targetInput != null)
                targetInput.on("focusin", function (e) { e.preventDefault(); targetInput.blur(); });

            if (action == "setDate") {
                var date = null;
                if (arguments[1] == null)
                    date = new Date();
                else if (arguments[1] instanceof Date)
                    date = arguments[1];
                else if (typeof (arguments[1]) === "string" || arguments[1] instanceof String) {
                    try {
                        date = $.datepicker.parseDate(CultureInfo.currentCulture.dateFormat.shortDatePattern.replace("yyyy", "yy").toLowerCase(), arguments[1]);
                    }
                    catch (err) {
                        date = new Date();
                    }
                }

                $this.data("mobileDatePickerDate", date);
                $this.val($.datepicker.formatDate(CultureInfo.currentCulture.dateFormat.shortDatePattern.replace("yyyy", "yy").toLowerCase(), $this.data("mobileDatePickerDate")));
            }
            else if (action == "getDate") {
                return $this.data("mobileDatePickerDate");
            }
            else if (action == "show") {
                var currentCultureDateFormat = CultureInfo.currentCulture.dateFormat;
                var pattern = currentCultureDateFormat.shortDatePattern.toLowerCase().replace(/(.)\1+/g, "$1").split(currentCultureDateFormat.dateSeparator);

                var picker = $("<table class='mobileDatePicker'><tr class='up'><td></td><td></td><td></td></tr><tr class='value'><td></td><td></td><td></td></tr><tr class='down'><td></td><td></td><td></td></tr></table>");
                var pickerButtons = {};
                pickerButtons[app.getTranslatedMessage("Ok")] = function () {
                    $this.val($.datepicker.formatDate(CultureInfo.currentCulture.dateFormat.shortDatePattern.replace("yyyy", "yy").toLowerCase(), $this.data("mobileDatePickerDate")));
                    $this.data("mobileDatePickerOnDateSelect")();

                    picker.dialog("close").dialog("destroy");
                };
                pickerButtons[app.getTranslatedMessage("Cancel")] = function () { picker.dialog("close").dialog("destroy"); };
                picker.dialog({
                    resizable: false,
                    modal: true,
                    buttons: pickerButtons
                }).siblings('div.ui-dialog-titlebar').remove();

                function showMobileDatePickerValue(date) {
                    picker.find(".value td[datePart=d]").text(date.getDate());
                    picker.find(".value td[datePart=m]").text(currentCultureDateFormat.shortMonthNames[date.getMonth()]);
                    picker.find(".value td[datePart=y]").text(date.getFullYear());
                }

                for (var i = 0; i < pattern.length; i++) {
                    picker.find("tr td:nth-child(" + (i + 1) + ")").attr("datePart", pattern[i]);
                }

                picker.find(".up > td").on("click", function () { handleMobileDatePickerClick(1, $(this)); });
                picker.find(".down > td").on("click", function () { handleMobileDatePickerClick(-1, $(this)); });

                showMobileDatePickerValue($this.data("mobileDatePickerDate") || new Date());

                function handleMobileDatePickerClick(n, td) {
                    var datePart = td.attr("datePart");
                    var date = $this.data("mobileDatePickerDate");
                    if (date == null) {
                        date = new Date();
                        $this.data("mobileDatePickerDate", date);
                    }
                    switch (datePart) {
                        case "d": {
                            date.setDate(date.getDate() + n);
                            break;
                        }

                        case "m": {
                            date.setMonth(date.getMonth() + n);
                            break;
                        }

                        case "y": {
                            date.setFullYear(date.getFullYear() + n);
                            break;
                        }
                    }

                    showMobileDatePickerValue(date);
                }
            }
            else if (typeof action === 'object' && action.onSelect) {
                $this.data("mobileDatePickerOnDateSelect", action.onSelect);
            }

            return $this;
        }
    }

    $.fn.vidyanoDatePicker = function (date, events) {
        if (date != null)
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        var defaults = $.extend({
            onDateSelected: false
        }, events);
        var functions = {
            triggerOnDateSelected: function (selectedDate, lostFocus) {
                if (defaults.onDateSelected)
                    defaults.onDateSelected(selectedDate, lostFocus);
            }
        };
        var eventFunctions = {
            onDateSelect: function () {
                var d = Number(datePickerInitiator.datepicker("getDate"));
                var oldDate = root.data("date");
                if (d == oldDate)
                    return;
                root.data("date", d);
                root.val(datePickerInitiator.val());

                root[0].date = datePickerInitiator.datepicker("getDate");
                functions.triggerOnDateSelected(root[0].date, true);
                root.change();
            }
        };

        var root = this;
        root[0].date = date;

        var wrapper = $.createElement("div").addClass("persistentObjectAttributeEditDateInput");
        root.parent().append(wrapper);

        var datePickerInitiator = $.createInput("text").attr("tabIndex", -1).hide().data("target", root);
        wrapper.append(datePickerInitiator);

        root.appendTo(wrapper);

        root.on("click", function (e) {
            this.select();
            datePickerInitiator.datepicker("setDate", root.val());
            datePickerInitiator.datepicker("show");

            e.preventDefault();
            e.stopPropagation();
        });

        root.data("date", Number(date));
        var currentCultureDateFormat = CultureInfo.currentCulture.dateFormat;
        var shortDatePattern = currentCultureDateFormat.shortDatePattern.toLowerCase();
        var maskFormat = shortDatePattern.replace(/[ymd]/g, "_");

        MaskedInput({
            elm: root[0],
            format: maskFormat,
            separator: currentCultureDateFormat.dateSeparator,
            onbadkey: function (e) {
                if (e == currentCultureDateFormat.dateSeparator) {
                    var value = root.val();
                    var caretIndex = root[0].selectionStart;
                    if (caretIndex - 1 > 0 && value.substr(caretIndex - 1, 1) == currentCultureDateFormat.dateSeparator)
                        return false;

                    var targetCaretIndex = value.indexOf(currentCultureDateFormat.dateSeparator, caretIndex);
                    if (targetCaretIndex > 0) {
                        var previousIndex = value.substr(0, caretIndex).lastIndexOf(currentCultureDateFormat.dateSeparator) + 1;
                        var changedValue = value.substring(previousIndex, caretIndex).padLeft(targetCaretIndex - previousIndex, "0");

                        root.val(value.substring(0, previousIndex) + changedValue + value.substr(targetCaretIndex));

                        datePickerInitiator.datepicker("setDate", root.val());
                        functions.triggerOnDateSelected(datePickerInitiator.datepicker("getDate"), false);

                        root[0].selectionStart = targetCaretIndex + 1;
                    }

                    return true;
                }

                return false;
            }
        });

        datePickerInitiator.datepicker({
            onSelect: eventFunctions.onDateSelect,
            showOn: "button",
            beforeShow: function () {
                var pos = root.offset();
                $.datepicker._pos = [pos.left, pos.top + root[0].offsetHeight];
            }
        })
        .datepicker("setDate", date)
        .datepicker("option", "firstDay", currentCultureDateFormat.firstDayOfWeek)
        .datepicker("option", "dateFormat", shortDatePattern.replace("yyyy", "yy"))
        .datepicker("option", "dayNames", currentCultureDateFormat.dayNames)
        .datepicker("option", "dayNamesMin", currentCultureDateFormat.minimizedDayNames)
        .datepicker("option", "dayNamesShort", currentCultureDateFormat.shortDayNames)
        .datepicker("option", "monthNames", currentCultureDateFormat.monthNames)
        .datepicker("option", "monthNamesShort", currentCultureDateFormat.shortMonthNames);

        if (date != null)
            root.val(datePickerInitiator.val());

        root.parent().find(".ui-datepicker-trigger").hide();

        root.clear = function () {
            root[0].date = null;
            datePickerInitiator.datepicker("setDate", null);
            root.val(maskFormat);

            functions.triggerOnDateSelected(datePickerInitiator.datepicker("getDate"), true);
        };

        root.setDate = function (value) {
            datePickerInitiator.datepicker("setDate", value);
            root.val(datePickerInitiator.val());

            functions.triggerOnDateSelected(value, false);
        };

        root.on("keydown", function () {
            datePickerInitiator.datepicker("hide");
        });

        root.on("keypress", function () {
            datePickerInitiator.datepicker("setDate", root.val());

            if (datePickerInitiator.val() == root.val()) {
                root[0].date = datePickerInitiator.datepicker("getDate");
                functions.triggerOnDateSelected(root[0].date, false);
            }
        });

        root.on("blur", function () {
            setTimeout(function() {
                if (root.val() == datePickerInitiator.val()) {
                    functions.triggerOnDateSelected(root[0].date, document.activeElement != document.body);
                    return;
                }

                if (root[0].date) {
                    datePickerInitiator.datepicker("setDate", root[0].date);
                    root.val(datePickerInitiator.val());
                } else
                    root.val(maskFormat);
            }, 1);
        });

        return root;
    };
})(jQuery);