function ProgramUnitItem(item) {
    this.id = item.id;
    this.title = item.title;
    this.persistentObject = null;
    this.objectId = null;
    this.query = null;
    this.filters = null;

    var filters = item.filters;
    if (!isNullOrWhiteSpace(filters))
        this.filters = filters.split(";");

    var iconData = item.icon;

    var queryData = item.query;
    if (queryData != null) {
        this.query =
        {
            id: queryData,
        };
    }

    var poData = item.persistentObject;
    if (poData != null) {
        this.persistentObject =
        {
            id: poData,
            objectId: item.objectId
        };
        this.objectId = item.objectId;
    }

    this.createFilterItems = function () {
        /// <summary>Creates the jQuery elements used to display the Porgram Unit Item</summary>
        var filterUl = $.createElement("ul");
        this.filters.run(function (filter) {
            var il = $.createElement("il");
            il.append(filter);
            filterUl.append(il);
        });
        return filterUl;
    };

    this.createElement = function (container) {
        /// <summary>Renders the Program Unit Item within the specified container. </summary>
        /// <param name="container">The container to render the Program Unit in. </param>
        if (this.filters == null) {
            var li = $.createElement("li", this);
            this.element = li;

            if (!isNullOrWhiteSpace(iconData)) {
                var icon = app.icons[iconData];
                if (!isNullOrWhiteSpace(icon.data)) {
                    var img = $.createElement("img");
                    img.attr({ src: icon.data.asDataUri(), alt: "Icon", title: this.title }).addClass("programUnitItemIcon");
                    li.append(img);
                }
            }

            var a = $.createElement("a");
            var href = "#!/";
            if (this.query == null)
                href += app.getUrlForPersistentObject(this.persistentObject);
            else
                href += app.getUrlForQuery(this.query);

            if (href == hasher.getHash())
                li.addClass("programUnitItemSelected");

            a.attr({ href: href, onclick: "return false;" }).text(this.title);
            li.append(a).on("click", eventFunctions.onProgramUnitItemClick);
            container.append(li);
        }
        else {
            var filterItem = new ProgramUnitItemWithFilter(this, item);

            filterItem.createElement(container);
        }
    };

    this.open = function (filterName) {
        /// <summary>Opens the Program Unit Item.</summary>
        /// <param name="filterName">The optional filtername to open</param>
        app.openProgramUnitItem(this, filterName);
    };

    var eventFunctions = {
        onProgramUnitItemClick: function (e) {
            var currentLi = $(this);
            var dataContext = currentLi.dataContext();

            dataContext.open();

            if ($.browser.mobile) {
                e.stopPropagation();
                e.preventDefault();
            }
        }
    };
}