(function ($) {
    $.fn.queryViewer = function (query, options) {
        var container = $(this);

        query.filterTarget = $("<div>").addClass("queryFilter");
        query.notificationTarget = $("<div>").addClass("queryNotification");

        container.append(query.filterTarget);
        container.append(query.notificationTarget);

        query.spinnerTarget = container;
        
        if (!isNullOrWhiteSpace(query.itemPanelTemplateKey) && app.templates[query.itemPanelTemplateKey] != null && typeof (app.templates[query.itemPanelTemplateKey].data) == "function") {
            query.target = container;

            var lastRenderedItemPanel = null;
            var render = function (postQueryRender) {
                if (lastRenderedItemPanel != null)
                    lastRenderedItemPanel.remove();
                
                query.target = lastRenderedItemPanel = $("<div>" + app.templates[query.itemPanelTemplateKey].data(query) + "</div>").css({"overflow": "auto"});
                container.append(lastRenderedItemPanel);
                
                if (postQueryRender)
                    query.postRender();
            };

            container.unbind("itemsChanged");
            container.bind("itemsChanged", function() { render(true); });

            render();
        }
        else if ($.mobile || (!isNullOrWhiteSpace(query.itemTemplateKey) && app.templates[query.itemTemplateKey] != null && typeof (app.templates[query.itemTemplateKey].data) == "function")) {
            query.target = container.queryList(query, options);
        }
        else {
            container.queryGrid(query, options);
        }

        if (!$.mobile) {
            var reCalculatetargetSize = function () {
                query.target.outerHeight(query.target.parent().height() - (query.filterTarget.is(":visible") ? query.filterTarget.outerHeight(true) : 0) - (query.notificationTarget.is(":visible") ? query.notificationTarget.outerHeight(true) : 0));
            };

            query.filterTarget.bind("resize", reCalculatetargetSize);
            query.notificationTarget.bind("resize", reCalculatetargetSize);
            container.bind("resize", reCalculatetargetSize);
        }
    };
})(jQuery);