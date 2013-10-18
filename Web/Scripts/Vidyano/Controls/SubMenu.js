(function ($) {
    var openMenus = [];

    $(document).on("click", function () {
        while (openMenus.length > 0) {
            openMenus.pop()();
        }
    });

    $.fn.subMenu = function (menu, options) {
        var target = $(this);

        menu.addClass("subMenu");
        menu.appendTo(target);

        var closeSubMenu = function (e) {
            var index = menu.parents("[data-menu='true']").length;
            var menusToClose = openMenus.splice(index, openMenus.length - index).reverse();
            while (menusToClose.length > 0) {
                menusToClose.pop()();
            }

            target.over = null;
            if (target.leaving) {
                clearTimeout(target.leaving);
                target.leaving = null;
            }

            menu.removeAttr("data-menu");

            if (e != null) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        var subMenuHover = function (e) {
            if (target.leaving) {
                clearTimeout(target.leaving);
                target.leaving = null;
            }

            if (target.over)
                return;

            target.over = closeSubMenu;
            openSubMenu(e);
        };

        var subMenuLeave = function () {
            if (target.leaving)
                return;

            target.leaving = setTimeout(function() {
                var mnu = openMenus.indexOf(target.over);
                if (mnu >= 0)
                    openMenus.slice(mnu, 1);

                if (target.over)
                    target.over();
            }, 300);
        };

        var openSubMenu = function (e) {
            if ($(e.target).closest(menu).length > 0)
                return;
            else{
                var menuAttr = menu.attr('data-menu');
                if (typeof menuAttr !== 'undefined' && menuAttr !== false) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            var left, top;

            var offset = target.offset();
            var height = target.outerHeight(true);
            var width = target.outerWidth(true);

            if (options) {
                if (options.minWidth)
                    menu.css("min-width", width + "px");

                if (options.onOpen)
                    options.onOpen(menu);
            }

            var menuWidth = menu.outerWidth(true);
            var menuHeight = menu.outerHeight(true);
            var isRootMenu = menu.parents("[data-menu='true']").length == 0;

            if (isRootMenu) {
                left = offset.left;
                top = (offset.top + height);
            }
            else {
                left = (offset.left + width);
                top = offset.top;
            }

            if (left + menuWidth > $(window).innerWidth() && offset.left + width - menuWidth > 0) {
                if (isRootMenu)
                    left = offset.left - menuWidth + width;
                else
                    left = offset.left - menuWidth;
            }

            if (left - menuWidth < 0 && left + menuWidth < $(window).innerWidth()) {
                left = offset.left;
            }

            if (top + menuHeight > $(window).innerHeight() && offset.top - menuHeight > 0) {
                top = offset.top - menuHeight;
            }

            menu.css({ left: Math.round(left) + "px", top: Math.round(top) + "px" });

            var index = menu.parents("[data-menu='true']").length;
            var menusToClose = openMenus.splice(index, openMenus.length - index).reverse();
            while (menusToClose.length > 0) {
                menusToClose.pop()();
            }

            menu.attr("data-menu", true);
            openMenus[index] = closeSubMenu;

            e.preventDefault();
            e.stopPropagation();

            return true;
        };

        target.off("click");
        target.on("click", openSubMenu);

        if (!app.isTablet && options && options.openOnHover) {
            target.off("mouseenter", subMenuHover);
            target.off("mouseleave", subMenuLeave);

            target.on("mouseenter", subMenuHover);
            target.on("mouseleave", subMenuLeave);
        }
    };
})(jQuery);