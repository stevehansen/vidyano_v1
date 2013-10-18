(function ($) {
    $.fn.toolTip = function (html, options, owner) {
        var tt = this;
        this.on("mouseenter", function () {
            var target = $(this);
            var tooltip = $('<div id="tooltip"></div>');
            if (options && options.extraClass)
                tooltip.addClass(options.extraClass);

            tooltip.css('opacity', 0)
                   .html(html)
                   .appendTo(owner || 'body');

            if ($(window).width() < tooltip.outerWidth() * 1.5)
                tooltip.css('max-width', $(window).width() / 2);
            else
                tooltip.css('max-width', 340);

            var offset = target.offset();
            var posLeft = offset.left + (target.outerWidth() / 2) - (tooltip.outerWidth() / 2),
                posTop = offset.top - tooltip.outerHeight() - 20;

            if (posLeft < 0) {
                posLeft = offset.left + target.outerWidth() / 2 - 20;
                tooltip.addClass('left');
            }
            else
                tooltip.removeClass('left');

            if (posLeft + tooltip.outerWidth() > $(window).width()) {
                posLeft = offset.left - tooltip.outerWidth() + target.outerWidth() / 2 + 20;
                tooltip.addClass('right');
            }
            else
                tooltip.removeClass('right');

            if (posTop < 0) {
                posTop = offset.top + target.outerHeight();
                tooltip.addClass('top');
            }
            else
                tooltip.removeClass('top');

            tooltip.css({ left: posLeft, top: posTop })
                   .animate({ top: '+=10', opacity: 1 }, 50);

            var removeTooltip = function () {
                tooltip.animate({ top: '-=10', opacity: 0 }, 50, function () {
                    $(this).remove();
                });
            };

            tt.on("mouseleave", removeTooltip);
            tooltip.on("click", removeTooltip);
        });
    };
})(jQuery);