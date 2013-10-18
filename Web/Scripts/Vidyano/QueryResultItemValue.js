function QueryResultItemValue(val, query, item) {
    this.key = val.key;
    this.value = val.value;
    this.displayValue = null;
    this.persistentObjectId = val.persistentObjectId;
    this.objectId = val.objectId;
    this.typeHints = val.typeHints;
    this.query = query;
    this.item = item;

    if (item != null)
        item._valuesByName[this.key] = this;
}

QueryResultItemValue.prototype.getColumn = function () {
    return this.query.getColumn(this.key);
};

QueryResultItemValue.prototype.getTypeHint = PersistentObjectAttribute.prototype.getTypeHint;

QueryResultItemValue.prototype.toServiceObject = function () {
    return copyProperties(this, ["key", "value", "persistentObjectId", "objectId"]);
};

QueryResultItemValue.prototype.toString = function () {
    return this.key + "=" + this.value;
};