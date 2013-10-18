function ProgramUnitItemGroup(title, id) {
    this.title = title;
    this.id = id;
    this.subItems = [];
}

ProgramUnitItemGroup.prototype.createElement = function (container) {
    /// <summary>Creates and append the jQuery elements used to display the item.</summary>
    /// <param name="container">The jQuery element used to place the element in. The container will not be cleared before appending.</param>
    var ul = $.createElement("ul").addClass("programUnitItemsGroup");

    this.subItems.forEach(function (subItem) {
        subItem.createElement(ul);
    });

    var li = this.element = $.createElement("li", this).addClass("programUnitItemsGroupHeader");

    var titleSpan = $("<a>");
    titleSpan.text(this.title);
    li.append(titleSpan);

    if (!$.mobile)
        li.subMenu(ul, { minWidth: true, openOnHover: true });
    else {
        ul.hide();
        li.append(ul);
        li.on("click", function (e) {
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