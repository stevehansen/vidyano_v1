(function ($) {
    $.fn.queryList = function (query, opt) {
        var options = $.extend({
            onRowClick: function () {
                query.onItemClicked($(this).dataContext());
            }
        }, opt);

        var methods = {
            renderItem: function (item) {
                var itemContainer = $.createElement('div', item).addClass('queryViewerItem');
                var selector = $.createElement('div', itemContainer).addClass('queryViewerItemSelector');
                var content = $.createElement('div').addClass('queryViewerItemContent');
                var antiFloatDiv = $.createElement('div').addClass('clearFloat');

                if (!$.mobile || (!isNullOrWhiteSpace(query.itemTemplateKey) && typeof (app.templates[query.itemTemplateKey].data) == "function")) {
                    content.append(app.templates[query.itemTemplateKey].data(item));

                    query.columns.forEach(function (col) {
                        content.find("div[data-vidyano-column=\"" + col.name + "\"]").each(function () {
                            col.render(item, $(this));
                        });

                        content.find("label[data-vidyano-column=\"" + col.name + "\"]").each(function () {
                            $(this).text(col.label);
                        });
                    });
                }
                else
                    content.append($.createElement("span").text(item.getValue("Breadcrumb")));

                selector.on('click', events.onQueryViewerItemSelectorClicked);
                content.on('click', options.onRowClick);

                itemContainer.append(selector, content, antiFloatDiv);
                queryViewerContainer.append(itemContainer);

                selector.height(Math.max(content.height(), 12));

                var selectedItems = query.items.selectedItems();
                if (selectedItems != null && selectedItems.contains(item))
                    itemContainer.addClass("selectedRow");
            },

            addPaging: function () {
                var paging = query.container.find(".paging");

                var resultPanel = query.container.find(".resultPanel");
                if (paging.length == 0 && query.parent != null && query.parent.target != null) {
                    paging = query.parent.target.find(".paging");
                }

                if (resultPanel.length == 0 && query.parent != null && query.parent.target != null) {
                    resultPanel = query.parent.target.find(".resultPanel");
                }

                if (paging.length > 0 && resultPanel.length > 0) {
                    var hasPaging = paging.queryPaging(query);
                    if (hasPaging)
                        resultPanel.addClass("pagingActive");
                    else
                        resultPanel.removeClass("pagingActive");

                    return hasPaging;
                }

                return false;
            },

            loadMore: function (container) {
                if (query.items.length == query.totalItems)
                    return;

                var loadMoreSpan = $("<span>").text(app.getTranslatedMessage("LoadMore"));
                var loadMoreElement = $("<div>").append(loadMoreSpan).addClass("loadMore");
                container.append(loadMoreElement);

                loadMoreSpan.one("click", function () {
                    loadMoreElement.empty();
                    loadMoreElement.spin(app.settings.defaultSpinnerOptions);

                    query.getItems(query.items.length, query.pageSize, function (start, length) {
                        loadMoreElement.remove();

                        query.items.slice(start, start + length).forEach(function (item) {
                            methods.renderItem(item);
                        });

                        methods.loadMore(container);
                    }, function (e) {
                        loadMoreElement.remove();
                        container.append(e);
                        methods.loadMore(container);
                    });
                });
            }
        };

        var events = {
            onQueryViewerItemSelectorClicked: function () {
                var itemDataContext = $(this).dataContext();
                if (itemDataContext.hasClass("selectedRow") || query.maxSelectedItems != 1) {
                    itemDataContext.toggleClass("selectedRow");
                }
                else {
                    root.find(".selectedRow").toggleClass("selectedRow");
                    itemDataContext.toggleClass('selectedRow');
                }
                var selectedItems = [];
                root.find('.selectedRow').each(function () {
                    selectedItems.push($(this).dataContext());
                });

                query.updateSelectedItems(selectedItems);
            }
        };

        var root = $(this);
        var queryViewerContainer = $.createElement('div', query).addClass("queryViewer");

        var hasPagingActive = false;
        var render = function () {
            if (!$.mobile && query.pageSize > 0 && (hasPagingActive || query.totalItems >= query.pageSize)) {
                hasPagingActive = methods.addPaging();
            }

            queryViewerContainer.empty();
            root.find(".noResults").remove();

            if (query.hasSearched) {
                if ($.mobile && query.items.length == 0)
                    root.append($("<p class='noResults'>").text(app.getTranslatedMessage("NoResultsFound")));
                else {
                    root.append(queryViewerContainer);

                    query.items.forEach(function (item) {
                        methods.renderItem(item);
                    });

                    if ($.mobile)
                        methods.loadMore(queryViewerContainer);
                }
            }
        };

        queryViewerContainer.off("itemsChanged");
        queryViewerContainer.on("itemsChanged", render);

        render();

        return queryViewerContainer;
    };
})(jQuery);