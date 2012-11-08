(function ($) {
    var openMenus = [];

    $(document).bind("click", function () {
        while (openMenus.length > 0) {
            openMenus.pop()();
        }
    });

    $.fn.subMenu = function (menu) {
        var target = $(this);

        menu.hide();
        menu.removeClass("subMenu");
        menu.appendTo(target);

        menu.css({ position: "fixed" });

        var closeSubMenu = function (e) {
            target.bind("click", openSubMenu);

            var index = menu.parents("[data-menu='true']").length;
            var menusToClose = openMenus.splice(index, openMenus.length - index).reverse();
            while (menusToClose.length > 0) {
                menusToClose.pop()();
            }

            menu.hide();
            menu.removeClass("subMenu");
            menu.removeAttr("data-menu");

            if (e != null) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        var openSubMenu = function (e) {
            var left, top;

            var offset = target.offset();
            var height = target.outerHeight(true);
            var width = target.innerWidth();
            var menuWidth = menu.outerWidth(true);
            var menuHeight = menu.outerHeight(true);

            if (menu.parents("[data-menu='true']").length == 0) {
                left = (offset.left + width - menuWidth);
                top = (offset.top + height);
            }
            else {
                left = (offset.left + width);
                top = offset.top;
            }

            if (left + menuWidth > $(window).innerWidth() && offset.left - menuWidth > 0) {
                left = offset.left - menuWidth;
            }

            if (left - menuWidth < 0 && left + menuWidth < $(window).innerWidth()) {
                left = offset.left;
            }

            if (top + menuHeight > $(window).innerHeight() && offset.top - menuHeight > 0) {
                top = offset.top - menuHeight;
            }

            menu.css({ left: left + "px", top: top + "px" });

            var index = menu.parents("[data-menu='true']").length;
            var menusToClose = openMenus.splice(index, openMenus.length - index).reverse();
            while (menusToClose.length > 0) {
                menusToClose.pop()();
            }

            openMenus[index] = closeSubMenu;

            target.unbind("click", openSubMenu);

            menu.attr("data-menu", true);
            menu.addClass("subMenu");
            menu.show();

            e.preventDefault();
            e.stopPropagation();
        };

        target.unbind("click");
        target.bind("click", openSubMenu);
    };
})(jQuery);