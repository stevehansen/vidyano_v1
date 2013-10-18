(function ($) {
    var options = ["-13:00", "-12:00", "-11:00", "-10:00", "-09:00", "-08:00", "-07:00", "-06:00", "-05:00", "-04:30", "-04:00", "-03:30", "-03:00", "-02:00", "-01:00", "+00:00", "+01:00", "+02:00", "+03:00", "+03:30", "+04:00", "+04:30", "+05:00", "+05:30", "+05:45", "+06:00", "+06:30", "+07:00", "+08:00", "+09:00", "+09:30", "+10:00", "+11:00", "+12:00", "+13:00", "+14:00"];

    $.fn.vidyanoOffsetPicker = function (offset, events) {
        var root = this;
        var isNullable = root.dataContext().type.startsWith("Nullable");

        var defaults = $.extend({
            onOffsetSelected: false
        }, events);
        var functions = {
            triggerOnOffsetSelected: function (selectedOffset) {
                if (defaults.onOffsetSelected && isNullable || !isNullOrEmpty(selectedOffset)) {
                    defaults.onOffsetSelected(isNullOrEmpty(selectedOffset) ? null : selectedOffset);
                }
            }
        };

        if (isNullable)
            root.append($.createElement("option").val(""));
        options.forEach(function (value) {
            root.append($.createElement("option").val(value).text(value));
        });

        if (offset != null)
            root.val(offset);

        root.on("change", function () {
            functions.triggerOnOffsetSelected(root.val());
        });

        root.clear = function () {
            root.val(null);
            functions.triggerOnOffsetSelected(null);
        };

        root.setOffset = function (value) {
            root.val(value);
            functions.triggerOnOffsetSelected(value);
        };

        return root;
    };
})(jQuery);