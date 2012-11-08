function QueryResultItemValue(val, query) {
    val.column = query.columns.firstOrDefault(function (c) { return c.name == val.key; });

    val.toServiceObject = function () {
        return copyProperties(val, ["key", "value", "persistentObjectId", "objectId"]);
    };

    return val;
}