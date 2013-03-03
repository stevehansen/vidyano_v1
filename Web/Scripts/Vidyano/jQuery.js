/// <reference path="/Scripts/jquery-1.9.1.min.js" />
/// <reference path="/Scripts/spin.js" />
/// <reference path="Application.js" />
/// <reference path="Common.js" />

///////////////////////////////////////////////////////////////
/// JQuery Extensions /////////////////////////////////////////
///////////////////////////////////////////////////////////////

(function ($) {
    (function (a) { $.mobile = /android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)); })(navigator.userAgent || navigator.vendor || window.opera);

    var lastAuthTokenUpdate = new Date();
    var findUri = /https?:\/\/[-\w]+(\.[-\w]+)*(:\d+)?(\/#?!?[^\.\s]*(\.[^\.\s]+)*)?/g;
    var findNewLine = /\r?\n|\r/g;

    $.postJSON = function (url, data, callback, onError) {
        $.support.cors = true; // Note: Allows cross domain requests
        $.crossDomain = true;

        var createdRequest = new Date();
        $.ajax({
            type: 'POST',
            url: url,
            cache: false,
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(data),
            dataType: 'json',
            success: function (result) {
                if (result.exception == null)
                    result.exception = result.ExceptionMessage;

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
                    }
                    else
                        app.navigate("SignIn");
                    return;
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
        if (actionsContainer.length > 0 && !$.mobile) {
            if (app.settings.dynamicActionBarExpander) {
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
            else {
                resultPanel.addClass("expandedActions");
                actionsContainer.addClass("expandedActions");
            }
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
        if (typeof (options) == "string")
            options = { message: options };

        var d = $.createElement("div");
        d.text(options.message);

        var createFunction = function (idx) {
            return function () {
                d.remove();

                if (onCompleted != null)
                    onCompleted(idx);
            };
        };

        var dialogOptions = {};
        if (options.buttons != null && options.buttons.length > 0) {
            for (var i = 0; i < options.buttons.length; i++)
                dialogOptions[options.buttons[i]] = createFunction(i);
        }
        else
            dialogOptions[app.getTranslatedMessage("Ok")] = createFunction(-1);

        return d.dialog({
            title: options.title || app.title,
            resizable: false,
            modal: true,
            width: options.width || 400,
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
