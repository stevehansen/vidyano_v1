/// <reference path="/Scripts/jquery-1.8.1.min.js" />
/// <reference path="/Scripts/spin.js" />
/// <reference path="Application.js" />
/// <reference path="Common.js" />

///////////////////////////////////////////////////////////////
/// JQuery Extensions /////////////////////////////////////////
///////////////////////////////////////////////////////////////

(function ($) {
    var lastAuthTokenUpdate = new Date();
    var findUri = /(https?:\/\/(([-\w\.]+)+(:\d+)?(\/([-\w\/#_\.]*(\?\S+)?)?)?))/g;
    var findNewLine = /\r?\n|\r/g;

    $.postJSON = function (url, data, callback, onError) {
        $.support.cors = true; // Note: Allows cross domain requests
        $.crossDomain = true;

        var createdRequest = new Date();
        $.ajax({
            type: 'POST',
            url: url,
            cache: false,
            contentType: 'text/json; charset=utf-8',
            data: JSON.stringify(data),
            dataType: 'json',
            success: function (result) {
                if (result.exception == null) {
                    if (createdRequest > lastAuthTokenUpdate) {
                        app.setAuthToken(result.authToken);
                        lastAuthTokenUpdate = createdRequest;
                    }
                    app.updateSession(result.session);
                }
                else if (result.exception == "Session expired") {
                    app.setAuthToken(null);
                    delete data.authToken;

                    if (app.isUsingDefaultUser()) {
                        data.userName = app.settings.defaultUserName;
                        data.password = app.settings.defaultPassword;
                        $.postJSON(url, data, callback, onError);

                        return;
                    }
                    else {
                        app.navigate("SignIn");

                        return;
                    }
                }

                callback(result);
            },
            error: function (e) {
                app.spin(false);

                if (onError != null)
                    onError(e.statusText + ", status: " + e.status);
                else if (window.console && window.console.log)
                    window.console.log(e.statusText);
            }
        });
    };

    $.createElement = function (tagName, data) {
        var e = $(document.createElement(tagName));
        if (typeof (data) != "undefined") {
            e.dataContext(data);
        }

        return e;
    };

    $.fn.dataContext = function (value) {
        if (typeof (value) == "undefined") {
            var data = this.data("vidyano.dataContext");
            var item = this;
            while (typeof (data) == "undefined") {
                var parent = item.parent();
                if (parent == null || parent.length == 0)
                    break;

                data = parent.data("vidyano.dataContext");
                item = parent;
            }
            return data;
        }

        return this.data("vidyano.dataContext", value);
    };

    $.createInput = function (type, data) {
        var e = document.createElement("input");

        e.setAttribute("type", type);
        if (typeof (data) != "undefined") {
            $(e).dataContext(data);
        }

        return $(e);
    };

    $.fn.attributeChanged = function (lostFocus) {
        var dataContext = this.dataContext();
        if (dataContext != null && dataContext.onChanged != null) {
            dataContext.onChanged(this[0], lostFocus);
        }
    };

    $.fn.showNotification = function (notification, type) {
        if (type == null)
            type = "Error";

        this.removeClass('notification-Error');
        this.removeClass('notification-Notice');
        this.removeClass('notification-OK');
        this.addClass("notification");
        this.addClass("notification-" + type);

        if (isNullOrWhiteSpace(notification)) {
            this.empty();
            this.hide();
        }
        else {
            this.html(notification.replace(findNewLine, "<br />").replace(findUri, "<a href=\"$1\" title=\"\">$1</a>"));

            var notificationCloseBox = $("<div>").addClass("notificationCloseBox").text("X");
            this.append(notificationCloseBox);

            var $this = this;
            notificationCloseBox.one("click", function () {
                $this.empty();
                $this.hide();
            });

            this.show();
        }
    };

    $.fn.spin = function (opts) {
        this.each(function () {
            var $this = $(this),
            data = $this.data();

            if (data.spinner) {
                $this.stop();
                data.spinner.stop();
                delete data.spinner;
                $this.fadeTo('fast', 1);
            }
            if (opts !== false) {
                data.spinner = new Spinner($.extend({ color: $this.css('color') }, opts)).spin(this);
                $this.fadeTo('fast', opts.spinOpacity || 0.5);
            }
        });
        return this;
    };

    $.fn.overflow = function overflow(overflowElement, overflowClassName, skipClass) {
        var target = this;
        var ul = this.find("ul");
        if (ul.length != 1)
            return this;

        overflowElement.attr("data-overflowElement", "true");
        ul = $(ul[0]);

        var table = $("<table>").css({ "table-layout": "fixed", width: "100%", height: "100%", "border-spacing": "0px", "border-collapse": "collapse" });
        var row = $("<tr>");
        table.append(row);

        var contentCol = $("<td>").css({ overflow: "hidden", "white-space": "nowrap" });
        row.append(contentCol);

        var overflowMenu = $("<ul>").addClass(overflowClassName || "menu").hide();
        target.append(overflowMenu);

        var closeResizePopup = function () {
            overflowMenu.hide();
            $(document).unbind("click", closeResizePopup);
        };

        contentCol.bind("resize", function () {
            var colWidth = contentCol.innerWidth();
            var ulWidth = ul.outerWidth(true);

            overflowMenu.hide();

            if (ulWidth > colWidth) {
                if (!overflowElement.is(":visible")) {
                    var children = ul.children("li:not([data-overflowElement='true'])");
                    if (children.length == 0)
                        return;

                    overflowElement.insertAfter($(children[children.length - 1]));
                    overflowElement.subMenu(overflowMenu);

                    overflowElement.show();
                }

                var children = [];
                ul.children("li:not([data-overflowElement='true'])").each(function (n) {
                    var c = $(this);
                    if (!c.hasClass(skipClass))
                        children.push({ c: c, n: n });
                });

                if (children.length == 0)
                    return;

                do {
                    var c = children.pop();
                    c.c.prependTo(overflowMenu);
                    c.c.data("previousPosition", c.n);

                    ulWidth = ul.outerWidth(true);
                }
                while (children.length > 0 && ulWidth >= colWidth);
            }
            else {
                var children = [];
                overflowMenu.children("li").each(function (c) { children.push($(this)); });

                if (children.length == 0)
                    return;

                do {
                    var c = children.splice(0, 1)[0];
                    var previousPosition = c.data("previousPosition");
                    if (previousPosition == 0)
                        ul.prepend(c);
                    else {
                        ul.children().each(function (n) {
                            if (n + 1 == previousPosition) {
                                c.insertAfter($(this));
                                return;
                            }
                        });
                    }

                    ul.append(overflowElement);
                    overflowElement.subMenu(overflowMenu);

                    ulWidth = ul.outerWidth(true);
                    if (ulWidth > colWidth) {
                        children.push(c);
                        c.prependTo(overflowMenu);
                        break;
                    }
                }
                while (children.length > 0 && ulWidth < colWidth);

                if (children.length == 0)
                    overflowElement.hide();
            }
        });

        this.append(table);

        overflowElement.appendTo(ul);
        var overflowButtonWidth = overflowElement.outerWidth(true);
        overflowElement.hide();

        ul.appendTo(contentCol);
        ul.css({ float: "left" });

        return this;
    };

    $.fn.actionBarExpander = function () {
        var resultPanel = $(this).find(".resultPanel");
        var actionsContainer = resultPanel.find(".resultActionsContainer");
        if (actionsContainer.length > 0 && !$.browser.mobile) {
            actionsContainer.bind("click", function () {
                if (actionsContainer.data("dynamicExpander")) {
                    unBindMouseEvents();
                    resultPanel.addClass("expandedActions");
                    actionsContainer.addClass("expandedActions");
                }
                else {
                    resultPanel.removeClass("expandedActions");
                    actionsContainer.removeClass("expandedActions");
                    bindMouseEvents();
                }
            });

            var unBindMouseEvents = function () {
                actionsContainer.data("dynamicExpander", false);
                actionsContainer.unbind("mouseenter");
                actionsContainer.unbind("mouseleave");
            };

            var bindMouseEvents = function () {
                actionsContainer.data("dynamicExpander", true);
                actionsContainer.bind("mouseenter", function () {
                    actionsContainer.data("timeoutId", setTimeout(function () {
                        actionsContainer.switchClass("", "expandedActions", 300, "easeOutQuad");
                    }, 1000));
                });

                actionsContainer.bind("mouseleave", function () {
                    clearTimeout(actionsContainer.data("timeoutId"));
                    actionsContainer.switchClass("expandedActions", "", 300, "easeOutQuad");
                });
            };

            bindMouseEvents();
        }
    };

    $.cookie = function (key, value, options) {
        // key and at least value given, set cookie...
        if (arguments.length > 1 && (Object.prototype.toString.call(value) === "[object String]" || value === null || value === undefined)) {
            options = $.extend({}, options);

            if (value == null)
                options.expires = -1;

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = String(value);

            return (document.cookie = [
                encodeURIComponent(key), '=',
                options.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join(''));
        }

        // key and possibly options given, get cookie...
        options = value || {};
        var decode = options.raw ? function (s) { return s; } : decodeURIComponent;

        var parts = document.cookie.split('; ');
        for (var i = 0, part; part = parts[i]; i++) {
            var pair = part.split('=');
            if (decode(pair[0]) === key) return decode(pair[1] || ''); // IE saves cookies with empty string as "c; ", e.g. without "=" as opposed to EOMB
        }
        return null;
    };

    $.messageBox = function (options, onCompleted) {
        var d = $.createElement("div");
        d.text(options.message);

        var createFunction = function (i) {
            return function () {
                d.remove();
                onCompleted(i);
            };
        };

        var dialogOptions = {};
        for (var i = 0; i < options.buttons.length; i++) {
            dialogOptions[options.buttons[i]] = createFunction(i);
        }

        d.dialog({
            title: options.title,
            resizable: false,
            modal: true,
            width: 400,
            buttons: dialogOptions
        });
    };

    $.fixFireFoxOffset = function (e) {
        if (typeof e.offsetX === "undefined" || typeof e.offsetY === "undefined") {
            var targetOffset = $(e.target).offset();
            e.offsetX = e.pageX - targetOffset.left;
            e.offsetY = e.pageY - targetOffset.top;
        }

        return e;
    };

    $.setVisibilityForState = function (state, visibility) {
        var task = visibility == true ? function (e) { e.show(); } : function (e) { e.hide(); };
        $("[data-vidyano-visibility-states~=\"" + state + "\"]").each(function () { task($(this)); });
    };

    $.fn.firstOrDefault = Array.prototype.firstOrDefault;
    $.fn.run = Array.prototype.run;
    $.fn.select = Array.prototype.select;
    $.fn.where = Array.prototype.where;
    $.fn.contains = Array.prototype.contains;
    $.fn.distinct = Array.prototype.distinct;
})(jQuery);