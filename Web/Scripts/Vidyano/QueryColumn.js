function QueryColumn(column, query) {
    /// <summary>Describes a Column inside a Query.</summary>

    changePrototype(column, QueryColumn);

    /// <field name="id" type="String">The unique identifier of this column.</field>
    /// <field name="name" type="String">The name of this column, matches the name of the attribute that this column represents.</field>
    /// <field name="label" type="String">The translated label of this column.</field>
    /// <field name="type" type="String">The Data Type that is used for this column.</field>
    /// <field name="width" type="String">The width that should be used for the column, setting this value to "0" will also hide the column.</field>

    /// <field name="query" type="Query">The Query where this column is used on.</field>
    column.query = query;
    /// <field name="offset" type="Number" integer="true">The position of the column inside the Query.</field>
    if (column.offset == null) column.offset = 0;
    /// <field name="isHidden" type="Boolean">Indicates whether the column is shown on the query or not.</field>
    if (column.isHidden == null) column.isHidden = false;
    /// <field name="disableSort" type="Boolean">Indicates whether the column can be sorted or not.</field>
    if (column.disableSort == null) column.disableSort = false;
    /// <field name="canFilter" type="Boolean">Indicates whether the column can be used in the Data Filter or not.</field>
    if (column.canFilter == null) column.canFilter = false;
    /// <field name="isPinned" type="Boolean">Indicates whether the column is pinned or not.</field>
    if (column.isPinned == null) column.isPinned = false;
    /// <field name="typeHints" type="Object">The Type Hints that are defined for this column.</field>
    if (column.typeHints == null) column.typeHints = {};

    /// <field name="includes" type="Array" elementType="String">The conditions that should be matched for the Data filter.</field>
    if (column.includes == null) column.includes = [];
    /// <field name="excludes" type="Array" elementType="String">The conditions that shouldn't be matched for the Data filter.</field>
    if (column.excludes == null) column.excludes = [];
    if (column.matchingDistincts == null) column.matchingDistincts = [];
    if (column.remainingDistincts == null) column.remainingDistincts = [];
    column.isNegated = false;

    if (query.columns != null) {
        var sourceColumn = query.columns.firstOrDefault(function (existingColumn) { return existingColumn.name == column.name; });
        if (sourceColumn != null) {
            column.isNegated = sourceColumn.isNegated;
            column.includes = sourceColumn.includes;
            column.excludes = sourceColumn.excludes;
            column.matchingDistincts = sourceColumn.matchingDistincts;
            column.remainingDistincts = sourceColumn.remainingDistincts;
        }
    }

    return column;
}

QueryColumn.prototype.clone = function (clonedQuery) {
    /// <summary>Clones this instance for the specified query.</summary>
    /// <param name="clonedQuery" type="Query">a cloned Query to attach to the QueryColumn as Query.</param>
    /// <returns>Returns a clone of this query column.</returns>
    var clone = jQuery.extend({}, this);
    changePrototype(clone, QueryColumn);
    clone.query = clonedQuery;
    return clone;
};

QueryColumn.prototype.getTypeHint = PersistentObjectAttribute.prototype.getTypeHint;

QueryColumn.prototype.render = function (values) {
    /// <summary>Generates the innerHTML for the cell when displayed in a Query.</summary>
    /// <returns type="String">Returns the HTML content used for rendering the cell.</returns>

    var name = this.name;
    var itemValue = values.firstOrDefault(function (v) { return v.key == name; });
    var value = itemValue != null ? itemValue.value : "";
    var typeHints = itemValue != null ? itemValue.typeHints : {};

    var template = app.templates[this.templateKey];
    if (template != null && typeof (template.data) == "function") {
        var rendered = template.data({ column: this, value: ServiceGateway.fromServiceString(value, this.type) });
        if (!isNullOrEmpty(rendered))
            return rendered;
    }

    if (this.type == "Image") {
        if (!isNullOrWhiteSpace(value)) {
            var width = this.getTypeHint("Width", "24", typeHints);
            var height = this.getTypeHint("Height", "24", typeHints);

            return "<img src=\"" + value.asDataUri() + "\" width=\"" + width + "\" height=\"" + height + "\" />";
        }
        return '';
    } else {
        var format = this.getTypeHint("DisplayFormat", "{0}", typeHints);

        value = ServiceGateway.fromServiceString(value, this.type);
        if (value != null && (this.type == "Boolean" || this.type == "NullableBoolean"))
            value = app.getTranslatedMessage(value ? this.getTypeHint("TrueKey", "True", typeHints) : this.getTypeHint("FalseKey", "False", typeHints));
        else if (this.type == "YesNo")
            value = app.getTranslatedMessage(value ? this.getTypeHint("TrueKey", "Yes", typeHints) : this.getTypeHint("FalseKey", "No", typeHints));

        if (format == "{0}") {
            if (this.type == "Date" || this.type == "NullableDate") {
                format = "{0:" + CultureInfo.currentCulture.dateFormat.shortDatePattern + "}";
            }
            else if (this.type == "DateTime" || this.type == "NullableDateTime" || this.type == "DateTimeOffset" || this.type == "NullableDateTimeOffset") {
                format = "{0:" + CultureInfo.currentCulture.dateFormat.shortDatePattern + " " + CultureInfo.currentCulture.dateFormat.shortTimePattern + "}";
            }
        }

        value = String.format(format, value);
    }

    var options = {};
    var hasOptions = false;
    var foreground = this.getTypeHint("Foreground", null, typeHints);
    if (!isNullOrEmpty(foreground)) {
        options.color = foreground;
        hasOptions = true;
    }

    var fontWeight = this.getTypeHint("FontWeight", null, typeHints);
    if (!isNullOrEmpty(fontWeight)) {
        options['font-weight'] = foreground.toLowerCase();
        hasOptions = true;
    }

    var horizontalContentAlignment = this.getTypeHint("HorizontalContentAlignment", null, typeHints);
    if (ServiceGateway.isNumericType(this.type)) {
        if (isNullOrEmpty(horizontalContentAlignment))
            horizontalContentAlignment = "Right";

        options['padding-right'] = '24px';
        hasOptions = true;
    }
    if (!isNullOrEmpty(horizontalContentAlignment)) {
        options['text-align'] = horizontalContentAlignment.toLowerCase();
        hasOptions = true;
    }

    var content = $("<div>");
    content.text(value); // NOTE: Leave div like this for HTML escaping

    var extraClass = this.getTypeHint("ExtraClass", null, typeHints);
    var hasExtraClass = !isNullOrEmpty(extraClass);
    if (hasOptions || hasExtraClass) {
        var div = $("<div>");
        div.append(content);
        
        if (hasOptions)
            content.css(options);

        if (hasExtraClass)
            content.addClass(extraClass);

        return div.html();
    }

    return content.html();
};

QueryColumn.prototype.toServiceObject = function () {
    /// <summary>Creates an optimized copy that can be sent to the service.</summary>
    /// <returns>Returns the optimized copy of the QueryColumn.</returns>
    return copyProperties(this, ["id", "name", "label", "includes", "excludes", "type", "displayAttribute"]);
};

QueryColumn.prototype.invertIncludesAndExcludes = function () {
    /// <summary>Inverts the filter includes and excludes, will return false if the operation didn't result in a changed (no selection yet)</summary>
    /// <returns type="Boolean">Returns a value indicating if any values where changed.</returns>
    if (this.excludes == this.includes)
        return false;

    if (this.excludes != null && this.excludes.length > 0 && this.includes != null && this.includes.length > 0) {
        this.includes = this.excludes = [];
        return false;
    }

    var excludes = this.excludes;
    this.excludes = this.includes;
    this.includes = excludes;

    return true;
};