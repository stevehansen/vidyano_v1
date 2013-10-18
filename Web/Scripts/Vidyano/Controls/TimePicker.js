(function ($) {
    var format = '__:__';

    $.fn.vidyanoTimePicker = function (time, events) {
        var defaults = $.extend({ onTimeSelected: false }, events);

        var root = this;
        root.val(time);
        root[0].time = time;
        var nullable = root.dataContext().type.startsWith("Nullable");

        var functions = {
            triggerOnTimeSelected: function (selectedTime, lostFocus) {
                if (selectedTime == format)
                    selectedTime = null;

                if (defaults.onTimeSelected && ((nullable && isNullOrEmpty(selectedTime)) || /^(([01]\d)|(2[0-3])):[0-5]\d$/.test(selectedTime))) {
                    root[0].time = selectedTime;
                    defaults.onTimeSelected(selectedTime, lostFocus);
                }
            }
        };

        MaskedInput({
            elm: root[0],
            format: format,
            separator: ':'
        });

        root.clear = function () {
            root.val(format);
            functions.triggerOnTimeSelected(null, true);
        };

        root.setTime = function (value) {
            root.val(value);
            functions.triggerOnTimeSelected(value, false);
        };

        root.on("blur", function () {
            root.val(root[0].time || format);
            functions.triggerOnTimeSelected(root.val(), true);
        });

        root.on("keydown", function () {
            functions.triggerOnTimeSelected(root.val(), false);
        });

        root.on("keypress", function (e) {
            var code = e.keyCode || e.which;
            if (this.selectionStart == 1 && code >= 51 && code <= 57) {
                root.val("0" + String.fromCharCode(code) + root.val().substring(2));
                this.selectionStart = 3;

                e.preventDefault();
                e.stopPropagation();
            }

            functions.triggerOnTimeSelected(root.val(), false);
        });

        root.on("click", function (e) {
            this.select();
            
            e.preventDefault();
            e.stopPropagation();
        });

        return this;
    };
})(jQuery);