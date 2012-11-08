(function ($) {
    $.fn.autoSizePanel = function (contents, remainderColumn) {
        var root = $(this);

        root.empty();

        var table = $("<table style='width: 100%; height: 100%; table-layout: auto'>");
        var row = $("<tr>");
        table.append(row);

        for (var i = 0; i < contents.length; i++) {
            var col = $("<td>");
            row.append(col);

            if (i != remainderColumn) {
                col.css({ 'width': '1px', 'white-space': 'nowrap', 'overflow': 'hidden', "vertical-align": "top" });
            }

            col.append(contents[i]);
        }

        root.append(table);

        return root;
    };
})(jQuery);