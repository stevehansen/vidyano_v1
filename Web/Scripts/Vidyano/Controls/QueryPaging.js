(function ($) {
    $.fn.queryPaging = function (query) {
        var target = $(this);
        target.empty();

        var first = $("<button>").addClass("first").button();
        target.append(first);

        var previous = $("<button>").addClass("previous").button();
        target.append(previous);

        var pageNumberText = $("<span>");
        target.append($("<div>").addClass("pageNumber").append(pageNumberText));

        var next = $("<button>").addClass("next").button();
        target.append(next);

        var last = $("<button>").addClass("last").button();
        target.append(last);

        first.on("click", function () {
            if ($(this).hasClass("disabled"))
                return;

            query.skip = 0;
            query.search(function () { update(); });
        });

        previous.on("click", function () {
            if ($(this).hasClass("disabled"))
                return;

            query.skip = (pageNumber() - 2) * query.pageSize;
            query.search(function () { update(); });
        });

        next.on("click", function () {
            if ($(this).hasClass("disabled"))
                return;

            query.skip = (query.skip || 0) + query.pageSize;
            query.search(function () { update(); });
        });

        last.on("click", function () {
            if ($(this).hasClass("disabled"))
                return;

            query.skip = (totalPages() - 1) * query.pageSize;
            query.search(function () { update(); });
        });

        var totalPages = function () {
            return Math.ceil(query.totalItems / query.pageSize);
        };

        var pageNumber = function () {
            return Math.ceil((query.skip + 1) / query.pageSize);
        };

        var update = function () {
            if (totalPages() < 2) {
                return false;
            }

            query.skip = query.skip || 0;

            if (pageNumber() == 1) {
                first.addClass("disabled");
                previous.addClass("disabled");
            }
            else {
                first.removeClass("disabled");
                previous.removeClass("disabled");
            }

            if (pageNumber() == totalPages()) {
                next.addClass("disabled");
                last.addClass("disabled");
            }
            else {
                next.removeClass("disabled");
                last.removeClass("disabled");
            }

            pageNumberText.text(String.format(app.getTranslatedMessage("CompactPagingInfo"), pageNumber(), totalPages()));
            return true;
        };

        return update(false);
    };
})(jQuery);