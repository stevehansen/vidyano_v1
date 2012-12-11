function ProgramUnitItem(item) {
    this.item = item;
    this.id = item.id;
    this.name = item.name;
    this.title = item.title || "";
    this.persistentObjectType = item.persistentObjectType;
    this.filters = !isNullOrEmpty(item.filters) ? item.filters.split(";") : null;
    this.iconId = item.icon;
    this.element = null;

    var queryData = item.query;
    if (queryData != null) {
        this.query = { id: queryData };
        this.queryName = item.queryName;
    }
    else {
        this.query = null;
        this.queryName = null;
    }

    var poData = item.persistentObject;
    if (poData != null) {
        this.persistentObject = { id: poData, objectId: item.objectId };
        this.objectId = item.objectId;
    }
    else {
        this.persistentObject = null;
        this.objectId = null;
    }
}

ProgramUnitItem.prototype.createElement = function (container) {
    /// <summary>Renders the Program Unit Item within the specified container. </summary>
    /// <param name="container" type="jQuery">The container to render the Program Unit in.</param>

    this.container = container;
    var li = $.createElement("li", { item: this, filter: null });
    this.element = li;

    if (this.filters == null) {
        this._generateImage(li);

        var a = $.createElement("a");
        var href = "#!/";
        if (this.query == null)
            href += app.getUrlForPersistentObject(this.persistentObject);
        else
            href += app.getUrlForQuery(this.query);

        if (href == hasher.getHash())
            li.addClass("programUnitItemSelected");

        a.attr({ href: href, onclick: "return false;" }).text(this.title);
        li.append(a).on("click", ProgramUnitItem._onProgramUnitItemClick);
        
        container.append(li);
    }
    else {
        if (this.item.group == null)
            this._generateImage(li);

        var titleLink = $.createElement("a").text(this.title);
        li.append(titleLink).addClass("programUnitItemsGroupHeader");

        var ul = this._generateFilterItems();
        if ($.browser.mobile) {
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
        else
            li.subMenu(ul);

        container.append(li);
    }
};

ProgramUnitItem.prototype.open = function (filterName) {
    /// <summary>Opens the Program Unit Item.</summary>
    /// <param name="filterName">The optional name of the filter to open a Query.</param>

    app.openProgramUnitItem(this, filterName);
};

ProgramUnitItem.prototype._generateFilterItems = function () {
    var ul = $.createElement("ul").addClass("programUnitItemsGroup");

    var self = this;
    this.filters.run(function (filter) {
        var filterItem = $.createElement("li", { item: self, filter: filter });

        var a = $.createElement("a");
        a.attr({ href: "#!/" + app.getUrlForQuery(self.query, filter), onclick: "return false;" }).text(filter);
        filterItem.append(a).on("click", ProgramUnitItem._onProgramUnitItemClick);
        
        ul.append(filterItem);
    });

    return ul;
};

ProgramUnitItem.prototype._generateImage = function (li) {
    var iconId = this.item.icon;
    if (iconId != null) {
        var icon = app.icons[iconId];
        if (icon != null && icon.data != null) {
            var img = $.createElement("img").addClass("programUnitItemIcon");
            img.attr({ src: icon.data.asDataUri(), alt: "Icon", title: this.title });
            li.append(img);
        }
    }
};

ProgramUnitItem._onProgramUnitItemClick = function (e) {
    var dataContext = $(this).dataContext();
    dataContext.item.open(dataContext.filter);

    if ($.browser.mobile) {
        e.stopPropagation();
        e.preventDefault();
    }
};