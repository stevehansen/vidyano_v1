function QueryResultItem(item, query) {
    /// <summary>Describes a single result item for a query.</summary>

    /// <field name="id" type="String">The unique identifier for this query result item, contains the objectId that should be used to open the item.</field>
    this.id = item.id;
    /// <field name="query" type="Query">The query for which this item was created.</field>
    this.query = query;
    /// <field name="values" type="Array" elementType="QueryResultItemValue">The values for this query result item, columns that had their default value are not included.</field>
    this._valuesByName = {};
    this.values = item.values ? item.values.map(function (val) { return new QueryResultItemValue(val, query, this); }, this) : [];
    this.typeHints = item.typeHints;
    /// <field name="breadcrumb" type="String">The breadcrumb for this query result item.</field>
    this.breadcrumb = item.breadcrumb;
}

QueryResultItem.prototype.getValue = function (key) {
    /// <summary>Get the QueryResultItemValue's value for the specified key.</summary>
    /// <param name="key" type="String">The key that should be looked for, matches the name of a column on the query.</param>
    /// <returns type="String">Returns the QueryResultItemValue's value for the specified key, or null if nothing was found.</returns>

    var value = this._valuesByName[key];
    return value != null ? value.value : null;
};

QueryResultItem.prototype.getFullValue = function (key) {
    /// <summary>Get the QueryResultItemValue instance for the specified key.</summary>
    /// <param name="key" type="String">The key that should be looked for, matches the name of a column on the query.</param>
    /// <returns type="QueryResultItemValue">Returns the QueryResultItemValue for the specified key, or null if no instance was found.</returns>

    return this._valuesByName[key];
};

QueryResultItem.prototype.getTypeHint = PersistentObjectAttribute.prototype.getTypeHint;

QueryResultItem.prototype.toServiceObject = function () {
    /// <summary>Clones this instance.</summary>
    /// <returns type="Object">Returns a clone of this Query Result Item that can be sent back to the server.</returns>

    return { id: this.id, values: this.values.map(function (val) { return val.toServiceObject(); }) };
};