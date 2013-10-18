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

        var searchInputContainer = $.createElement("div").addClass("searchInputContainer");
        var input = $.createInput("text")
            .on("keypress", eventMethods.onKeyPress)
            .val(query.textSearch || "")
            .attr("placeholder", app.getTranslatedMessage("FilterSearchHint"));
        var search = $.createElement("div")
            .addClass("searchButton")
            .on("click", eventMethods.onSearchClick);

        container.append(searchInputContainer.append(input).append(search));
        if (query.parent == null || !query.parent.isMasterDetail() || query.focusSearch) {
            input[0].selectionStart = input.val().length;
            delete query.focusSearch;
        }

        if (!$.mobile && query.actionNames.contains("Filter") && !asLookup && !query.options.noDataFilter) {
            var filter = $.createElement("div").addClass("filterButton");
            container.append(filter);

            if (query.filter.currentFilter != null) {
                query.filter.createFilter(query.filterTarget);
            }

            var filterMenu = $.createElement("div").addClass("queryFilterMenu");
            filter.append(filterMenu);

            filter.subMenu(filterMenu, {
                onOpen: function () { query.filter.openPopup(filterMenu); }
            });
        }

        if ($.mobile)
            input.blur();
    };
})(jQuery);