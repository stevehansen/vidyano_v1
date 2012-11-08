(function ($) {
    var options = ["-13:00", "-12:00", "-11:00", "-10:00", "-09:00", "-08:00", "-07:00", "-06:00", "-05:00", "-04:30", "-04:00", "-03:30", "-03:00", "-02:00", "-01:00", "+00:00", "+01:00", "+02:00", "+03:00", "+03:30", "+04:00", "+04:30", "+05:00", "+05:30", "+05:45", "+06:00", "+06:30", "+07:00", "+08:00", "+09:00", "+09:30", "+10:00", "+11:00", "+12:00", "+13:00", "+14:00"];

    $.fn.vidyanoOffsetPicker = function (offset, events) {
        var defaults = $.extend({
            onOffsetSelected: false
        }, events);
        var functions = {
            triggerOnOffsetSelected: function (selectedOffset) {
                if (defaults.onOffsetSelected) {
                    defaults.onOffsetSelected(isNullOrWhiteSpace(selectedOffset) ? null : selectedOffset);
                }
            }
        };

        var root = $(this);

        options.run(function (value) {
            root.append($.createElement("option").val(value));
        });
        root.editableSelect({
            selectedValue: offset,
            onSelect: function (selectedOffset) {
                if (selectedOffset != "" && selectedOffset.length == 6)
                    functions.triggerOnOffsetSelected(selectedOffset);
            }
        });

        var input = $(".editable-select", root.parent());

        root.clear = function () {
            root.val(null);
            input.val("");
            functions.triggerOnOffsetSelected(null);
        };

        root.setOffset = function (value) {
            input.val(value);
            functions.triggerOnOffsetSelected(value);
        };

        return root;
    };
})(jQuery);