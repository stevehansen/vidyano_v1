function ProgramUnitItemWithFilter(programUnitItem, item) {
    var isInGroup = item.group != null;
    var page = $("#containerContainer");

    this.createElement = function (container) {
        /// <summary>Creates and appends the items used to display the Program Unit Item with Filter to the container.</summary>
        /// <param name="container">The container used to place the items. </param>
        this.container = container;

        var li = $.createElement("li", programUnitItem);
        var ul = methods.generateFilterItems().addClass("programUnitItemsGroup");

        var titleLink = $("<a>");
        titleLink.text(programUnitItem.title);

        if (!isInGroup) {
            var iconData = item.icon;

            if (!isNullOrWhiteSpace(iconData)) {
                var icon = app.icons[iconData];
                if (!isNullOrWhiteSpace(icon.data)) {
                    var img = $.createElement("img");
                    img.attr({ src: icon.data.asDataUri(), alt: "Icon", title: this.title }).addClass("programUnitItemIcon");
                    li.append(img);
                }
            }
        }

        li.append(titleLink).addClass("programUnitItemsGroupHeader");
        if (!$.browser.mobile)
            li.subMenu(ul);
        else {
            ul.hide();
            li.append(ul);
            li.bind("click", function (e) {
                if (ul.is(':visible'))
                    ul.hide();
                else
                    ul.show();

                e.stopPropagation();
                e.preventDefault();
            });
        }

        container.append(li);
    };

    var methods = {
        generateFilterItems: function () {
            var ul = $.createElement("ul");

            programUnitItem.filters.run(function (filter) {
                var filterItem = $.createElement("li", programUnitItem);

                var a = $.createElement("a");
                a.attr({ href: "#!/" + app.getUrlForQuery(programUnitItem.query, filter), onclick: "return false;" }).text(filter);
                filterItem.append(a).on("click", events.onFilterItemsClick);

                ul.append(filterItem);
            });

            return ul;
        }
    };

    var events = {
        onFilterClick: function (e) {
            var container = container.parent().find(".filterOptionsContainer");
            var ul = $(this).data("vidyano.filterItems");
            container.append(ul);

            container.find("ul").each(function () {
                if ($(this) != ul)
                    $(this).hide();
            });

            if (ul.css("display") != "none") {
                ul.hide();
            } else {
                ul.show();
            }

            page.on("click.clearFilterItems", events.onPageClick);
            e.stopPropagation();
        },

        onFilterItemsClick: function (e) {
            var filterItem = $(this);

            filterItem.dataContext().open(filterItem.text());

            if ($.browser.mobile) {
                e.stopPropagation();
                e.preventDefault();
            }
        },

        onPageClick: function () {
            container.parent().find(".filterOptionsContainer ul").each(function () {
                $(this).hide();
            });

            page.off("click.clearFilterItems", events.onPageClick);
        }
    };
}