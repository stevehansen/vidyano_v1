(function ($) {
    $.fn.vidyanoDatePicker = function (date, events) {
        var defaults = $.extend({
            onDateSelected: false
        }, events);
        var functions = {
            triggerOnDateSelected: function (selectedDate) {
                if (defaults.onDateSelected)
                    defaults.onDateSelected(selectedDate);
            }
        };
        var eventFunctions = {
            onDateSelect: function () {
                functions.triggerOnDateSelected(root.datepicker("getDate"));
            }
        };

        var root = $(this);
        var currentCultureDateFormat = CultureInfo.currentCulture.dateFormat;

        root.datepicker({ onSelect: eventFunctions.onDateSelect })
            .datepicker("setDate", date)
            .datepicker("option", "firstDay", currentCultureDateFormat.firstDayOfWeek)
            .datepicker("option", "dateFormat", currentCultureDateFormat.shortDatePattern.toLowerCase().replace("yy", "y").replace("yyy", "yy"))
            .datepicker("option", "dayNames", currentCultureDateFormat.dayNames)
            .datepicker("option", "dayNamesMin", currentCultureDateFormat.minimizedDayNames)
            .datepicker("option", "dayNamesShort", currentCultureDateFormat.shortDayNames)
            .datepicker("option", "monthNames", currentCultureDateFormat.monthNames)
            .datepicker("option", "monthNamesShort", currentCultureDateFormat.shortMonthNames)
            .on("blur", eventFunctions.onDateSelect);

        root.clear = function () {
            root.datepicker("setDate", null);
            functions.triggerOnDateSelected(root.datepicker("getDate"));
        };

        root.setDate = function (value) {
            root.datepicker("setDate", value);
            functions.triggerOnDateSelected(value);
        };

        return root;
    };
})(jQuery);
