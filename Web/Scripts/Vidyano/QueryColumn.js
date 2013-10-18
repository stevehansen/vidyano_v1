function QueryColumn(column, query) {
    /// <summary>Describes a Column inside a Query.</summary>

    /// <field name="id" type="String">The unique identifier of this column.</field>
    this.id = column.id;
    /// <field name="name" type="String">The name of this column, matches the name of the attribute that this column represents.</field>
    this.name = column.name;
    /// <field name="label" type="String">The translated label of this column.</field>
    this.label = column.label;
    /// <field name="type" type="String">The Data Type that is used for this column.</field>
    this.type = column.type;
    /// <field name="width" type="String">The width that should be used for the column, setting this value to "0" will also hide the column.</field>
    this.width = column.width;
    this.dragWidth = null;
    /// <field name="query" type="Query">The Query where this column is used on.</field>
    this.query = query;
    /// <field name="offset" type="Number" integer="true">The position of the column inside the Query.</field>
    this.offset = column.offset || 0;
    /// <field name="isHidden" type="Boolean">Indicates whether the column is shown on the query or not.</field>
    this.isHidden = !!column.isHidden;
    /// <field name="disableSort" type="Boolean">Indicates whether the column can be sorted or not.</field>
    this.disableSort = !!column.disableSort;
    /// <field name="canFilter" type="Boolean">Indicates whether the column can be used in the Data Filter or not.</field>
    this.canFilter = !!column.canFilter;
    /// <field name="isPinned" type="Boolean">Indicates whether the column is pinned or not.</field>
    this.isPinned = !!column.isPinned;
    /// <field name="typeHints" type="Object">The Type Hints that are defined for this column.</field>
    this.typeHints = column.typeHints || {};
    /// <field name="includes" type="Array" elementType="String">The conditions that should be matched for the Data filter.</field>
    this.includes = column.includes || [];
    /// <field name="excludes" type="Array" elementType="String">The conditions that shouldn't be matched for the Data filter.</field>
    this.excludes = column.excludes || [];
    this.matchingDistincts = column.matchingDistincts || [];
    this.remainingDistincts = column.remainingDistincts || [];
    this.isSystem = !!column.isSystem;
    this.isNegated = !!column.isNegated;
    this.displayAttribute = column.displayAttribute;
    this.templateKey = column.templateKey;

    this._safeName = null;
    this._detailColumnWidth = null;

    if (query != null && query.columns != null) {
        var sourceColumn = query.columns.firstOrDefault(function (existingColumn) { return existingColumn.name == column.name; });
        if (sourceColumn != null) {
            this.isNegated = !!sourceColumn.isNegated;
            this.includes = sourceColumn.includes || [];
            this.excludes = sourceColumn.excludes || [];
            this.matchingDistincts = sourceColumn.matchingDistincts || [];
            this.remainingDistincts = sourceColumn.remainingDistincts || [];
        }
    }

    if (query != null)
        query._columnsByName[this.name] = this;
}

QueryColumn._emptyItemValue = { value: "", displayValue: "", typeHints: {} };

QueryColumn.prototype.clone = function (clonedQuery) {
    /// <summary>Clones this instance for the specified query.</summary>
    /// <param name="clonedQuery" type="Query">a cloned Query to attach to the QueryColumn as Query.</param>
    /// <returns type="QueryColumn">Returns a clone of this query column.</returns>

    var clone = new QueryColumn(this);
    clone.query = clonedQuery;
    return clone;
};

QueryColumn.prototype.getTypeHint = PersistentObjectAttribute.prototype.getTypeHint;

QueryColumn.prototype.render = function (values, target) {
    /// <summary>Fills the target with the item value for this column when displayed in a Query.</summary>
    // NOTE: values can be QueryResultItem or an array of QueryResultItemValue

    var name = this.name;
    var type = this.type;
    
    var itemValue = (typeof (values.getFullValue) == "function" ? values.getFullValue(name) : values.firstOrDefault(function (v) { return v.key == name; })) || QueryColumn._emptyItemValue;
    var value = itemValue.value;
    var typeHints = itemValue.typeHints;

    var template = app.templates[this.templateKey];
    if (template != null && typeof (template.data) == "function") {
        target[0].innerHTML = template.data({ column: this, value: ServiceGateway.fromServiceString(value, type) });
        return;
    }

    if (type == "Image") {
        if (!isNullOrEmpty(value)) {
            var width = this.getTypeHint("Width", "24", typeHints);
            var height = this.getTypeHint("Height", "24", typeHints);

            var children = target.children();
            if (children.length == 1 && children[0].tagName == "IMG")
                children[0].src = value.asDataUri();
            else {
                var img = document.createElement("img");
                img.width = width;
                img.height = height;
                img.src = value.asDataUri();
                target.append(img);
            }
        }
        else
            target.empty();
        
        return;
    }
    else {
        if (itemValue.displayValue == null) {
            var format = this.getTypeHint("DisplayFormat", null, typeHints);

            value = ServiceGateway.fromServiceString(value, type);
            if (value != null && (type == "Boolean" || type == "NullableBoolean"))
                value = app.getTranslatedMessage(value ? this.getTypeHint("TrueKey", "True", typeHints) : this.getTypeHint("FalseKey", "False", typeHints));
            else if (type == "YesNo")
                value = app.getTranslatedMessage(value ? this.getTypeHint("TrueKey", "Yes", typeHints) : this.getTypeHint("FalseKey", "No", typeHints));
            else if (type == "Time" || type == "NullableTime") {
                if (value != null) {
                    value = value.trimEnd('0').trimEnd('.');
                    if (value.startsWith('0:'))
                        value = value.substr(2);
                    if (value.endsWith(':00'))
                        value = value.substr(0, value.length - 3);
                }
            }

            if (value != null) {
                if (format == null || format == "{0}") {
                    switch (type) {
                        case "Date":
                        case "NullableDate":
                            format = null;
                            value = value._netFormat(CultureInfo.currentCulture.dateFormat.shortDatePattern, true);
                            break;
                            
                        case "DateTime":
                        case "NullableDateTime":
                        case "DateTimeOffset":
                        case "NullableDateTimeOffset":
                            format = null;
                            value = value._netFormat(CultureInfo.currentCulture.dateFormat.shortDatePattern + " " + CultureInfo.currentCulture.dateFormat.shortTimePattern, true);
                            break;
                    }
                }

                if (isNullOrEmpty(format))
                    value = value.localeFormat ? value.localeFormat() : value.toLocaleString();
                else
                    value = String.format(format, value);
            }
            else
                value = "";

            itemValue.displayValue = value;
        }
        else
            value = itemValue.displayValue;
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
    if (ServiceGateway.isNumericType(type)) {
        if (isNullOrEmpty(horizontalContentAlignment))
            horizontalContentAlignment = "Right";

        hasOptions = true;
    }
    if (!isNullOrEmpty(horizontalContentAlignment)) {
        options['text-align'] = horizontalContentAlignment.toLowerCase();
        hasOptions = true;
    }

    if (target[0].firstChild != null)
        target[0].firstChild.nodeValue = value;
    else
        target[0].appendChild(document.createTextNode(value));

    var differentOptions = false;
    if (hasOptions) {
        differentOptions = target[0].columnOptions == null;
        if (!differentOptions) {
            for (var o in target[0].columnOptions) {
                if (options[o] != target[0].columnOptions[o]) {
                    differentOptions = true;
                    break;
                }
            }

            if (!differentOptions) {
                for (var o in options) {
                    if (target[0].columnOptions[o] != options[o]) {
                        differentOptions = true;
                        break;
                    }
                }
            }
        }
    }

    var extraClass = this.getTypeHint("ExtraClass", null, typeHints);
    var differentExtraClass = extraClass != target[0].columnExtraClass;

    if (differentOptions || differentExtraClass) {
        this.removeExtraStyles(target);

        target.css(options);
        target[0].columnOptions = options;

        target.addClass(extraClass);
        target[0].columnExtraClass = extraClass;
    }
};

QueryColumn.prototype.removeExtraStyles = function (target) {
    if (target[0].columnOptions != null) {
        for (var o in target[0].columnOptions) {
            target.css(o, "");
        }
        target[0].columnOptions = null;
    }

    if (target[0].columnExtraClass != null)
        target.removeClass(target[0].columnExtraClass);
};

QueryColumn.prototype.safeName = function () {
    /// <summary>Creates a safe name that can be used as css class name.</summary>
    /// <returns type="String">Returns the safe name.</returns>

    if (this._safeName == null) {
        this._safeName = this.name.replace(/[\. ]/g, "_");

        if (/^\d/.test(this._safeName))
            this._safeName = "_" + this._safeName;
    }

    return this._safeName;
};

QueryColumn.prototype.toServiceObject = function () {
    /// <summary>Creates an optimized copy that can be sent to the service.</summary>
    /// <returns type="Object">Returns the optimized copy of the QueryColumn.</returns>

    return copyProperties(this, ["id", "name", "label", "includes", "excludes", "type", "displayAttribute"]);
};

QueryColumn.prototype.toString = function () {
    return this.name + " (" + this.type + ")";
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