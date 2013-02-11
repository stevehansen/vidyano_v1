function ProgramUnit(item, hasManagement) {
    this.id = item.id;
    this.item = item;
    this.title = item.title;
    this.templateId = item.template;
    this.hasTemplate = this.templateId != null;
    this.items = [];
    
    this._liElement = null;
    this._hasManagement = hasManagement;

    this._processItems = function (newItems) {
        var items = [];
        newItems.run(function (puItem) {
            var pui = new ProgramUnitItem(puItem);
            var group = puItem.group;

            if (group != null) {
                var groupItem = items.firstOrDefault(function (mi) { return mi.id == group.id; });
                if (groupItem == null) {
                    groupItem = new ProgramUnitItemGroup(group.title, group.id);
                    items.push(groupItem);
                }

                groupItem.subItems.push(pui);
            } else
                items.push(pui);
        });

        this.items = items;
    };
    this._processItems(item.items);
}

ProgramUnit.prototype.createElement = function () {
    /// <summary>Creates the jQuery element used to display the Program Unit.</summary>
    var a = $.createElement("a");
    var self = this;

    var href = "#!/";
    href += app.getUrlForProgramUnit(this);

    a.attr({ href: href, onclick: "return false;" }).text(this.title);

    this._liElement = this.selector = $.createElement("li", this).addClass("programUnit").append(a);
    
    if (href == hasher.getHash())
        li.addClass("programUnitItemSelected");


    this._liElement.click(function () {
        if (app.programUnits.selectedItem() != self)
            app.programUnits.selectedItem(self);
    });

    return this._liElement;
};

ProgramUnit.prototype.open = function () {
    /// <summary>Opens the Program Unit. This will show the Program Unit Items in the menu.</summary>
    var shouldRedirect = isNullOrWhiteSpace(app.returnUrl());
    this._openItems();

    if (shouldRedirect)
        this._redirect();
};

ProgramUnit.prototype.openTemplate = function () {
    /// <summary>Renders the Program Unit with it's specified template inside the element with id "content". Renders nothing if the Program Unit does not have a template.</summary>
    var $content = $("#content");
    $content.empty();
    $content.dataContext(this);

    if (!this.hasTemplate)
        return;

    var templateCreator = app.templates[this.templateId];
    if (templateCreator == null || typeof (templateCreator.data) != "function")
        return;

    var template = templateCreator.data(this);

    if ($content.dataContext() == this)
        $content.append(template);
};

ProgramUnit.prototype._addItem = function () {
    var self = this;
    app.gateway.getQuery("5a4ed5c7-b843-4a1b-88f7-14bd1747458b", null, function (query) {
        var select = new SelectReferenceDialogActions(query, 1, function (selectedItems) {
            app.gateway.executeAction("Query.AddQueriesToProgramUnit", null, query, selectedItems, { Id: self.id }, function (result) {
                if (result.notification != null) {
                    app.showException(result.notification);
                    return;
                }

                self._processItems(JSON.parse(result.getAttributeValue("Items")));
                self._openItems();
            });
        });
        select.showDialog();
    });
};

ProgramUnit.prototype._openItems = function () {
    var puiContainer = $(".programUnitItems");
    puiContainer.empty();

    if ($.mobile) {
        puiContainer.remove();

        puiContainer = $("<div>").addClass("programUnitItems");
        if (this._liElement != null)
            this._liElement.append(puiContainer);
    }

    var ul = $("<ul>").addClass("list");
    puiContainer.append(ul);

    if (!$.mobile)
        puiContainer.overflow($("<li><a>...</a></li>"), "programUnitItemsOverflow", "addProgramUnitItem");

    var self = this;
    if (!$.mobile && this.hasTemplate) {
        var spanContainer = $("<li>").on("click", function () { self._redirect(); }).addClass("programUnitTemplate");
        ul.append(spanContainer);
    }

    this.items.run(function (pui) {
        pui.createElement(ul);
    });

    if (this._hasManagement && !$.mobile && this.item.offset != 2147483647) {
        var addItem = $.createElement("li", this);
        addItem.addClass("addProgramUnitItem").on("click", function () { self._addItem(); });
        ul.append(addItem);
    }
};

ProgramUnit.prototype._redirect = function () {
    var path = app.getUrlForProgramUnit(this);

    app.pageObjects[path] = this;
    hasher.setHash(path);
};