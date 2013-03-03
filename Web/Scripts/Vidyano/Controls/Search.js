(function ($) {
    $.fn.createSearch = function (query, onSearchCompleted, asLookup) {
        var container = this;
        container.empty();

        var eventMethods = {
            onSearchClick: function () {
                var value = input.val();

                query.textSearch = value;
                query.skip = 0;
                query.search(function () {
                    if(onSearchCompleted != null)
                        onSearchCompleted();

                    input.get(0).focus();
                });
            },

            onKeyPress: function (e) {
                if ((e.keyCode || e.which) == 13) {
                    eventMethods.onSearchClick();
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
        };

        var input = $.createInput("text")
           .on("keypress", eventMethods.onKeyPress)
            .val(query.textSearch || "")
            .attr("placeholder", app.getTranslatedMessage("FilterSearchHint"));
        var search = $.createElement("button").button()
            .addClass("searchButton")
            .on("click", eventMethods.onSearchClick);

        container.append(input).append(search);
        if (query.parent == null || !query.parent.isMasterDetail() || query.focusSearch) {
            input[0].selectionStart = input.val().length;
            delete query.focusSearch;
        }

        if (!$.mobile && query.actionNames.contains("Filter") && !asLookup) {
            var filter = $.createElement("button").button().addClass("filterButton");
            container.append(filter);

            if (query.filter.currentFilter != null) {
                query.filter.createFilter(query.filterTarget);
            }

            var filterMenu = $.createElement("div").addClass("queryFilterMenu subMenu");
            container.append(filterMenu);

            filter.on("click", function (e) {
                query.filter.openPopup(filterMenu);
                e.stopPropagation();
                e.preventDefault();
            });
        }
    };
})(jQuery);