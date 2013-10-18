function PersistentObjectAttribute(attribute, parent) {
    /// <summary>Describes an Attribute of a Persistent Object.</summary>

    /// <field name="id" type="String">The unique identifier of this Persistent Object Attribute's definition.</field>
    this.id = attribute.id;
    this.isSystem = !!attribute.isSystem;
    this.group = attribute.group;
    this.tab = attribute.tab;
    /// <field name="name" type="String">The name of this Persistent Object Attribute.</field>
    this.name = attribute.name;
    /// <field name="label" type="String">The translated label of this Persistent Object Attribute.</field>
    this.label = attribute.label;
    /// <field name="parent" type="PersistentObject">Gets the owner Persistent object for this instance.</field>
    this.parent = parent;
    /// <field name="isReadOnly" type="Boolean">Determines if the Persistent Object Attribute can be edited or not.</field>
    this.isReadOnly = !!attribute.isReadOnly;
    /// <field name="isRequired" type="Boolean">Determines if the Persistent Object Attribute is required.</field>
    this.isRequired = !!attribute.isRequired;
    this.isValueChanged = !!attribute.isValueChanged;
    this.options = attribute.options || [];
    /// <field name="offset" type="Number">Determines the position of this Persistent Object Attribute.</field>
    this.offset = attribute.offset || 0;
    this.type = attribute.type;
    this.toolTip = attribute.toolTip;
    this.rules = attribute.rules;
    this.validationError = attribute.validationError;
    this.visibility = attribute.visibility;
    this.typeHints = attribute.typeHints || {};
    this.value = attribute.value;
    this.editTemplateKey = attribute.editTemplateKey;
    this.templateKey = attribute.templateKey;
    this.disableSort = !!attribute.disableSort;
    this.triggersRefresh = !!attribute.triggersRefresh;
    this.column = attribute.column;
    this.columnSpan = attribute.columnSpan || 0;

    this._backup = {};
    this._refreshValue = undefined;
    this._queueTriggersRefresh = false;

    if (attribute.lookup != null) {
        this.lookup = attribute.lookup;
        this.asDetail = !!attribute.asDetail;
        this.objects = attribute.objects;
        this.selectInPlace = !!attribute.selectInPlace;
        this.objectId = attribute.objectId;
        this.canAddNewReference = attribute.canAddNewReference;
        this.displayAttribute = attribute.displayAttribute;

        PersistentObjectAttributeWithReference(this);
    }

    if (parent != null)
        parent._attributesByName[this.name] = this;
}

function PersistentObjectAttributeWithReference(attribute) {
    var isDialogOpen = false;

    attribute.lookup = new Query(attribute.lookup, attribute.parent, true);

    if (attribute.asDetail) {
        if (attribute.objects != null) {
            attribute.objects = attribute.objects.map(function (obj) {
                var detailObj = new PersistentObject(obj);
                detailObj.parent = attribute.parent;
                detailObj.ownerDetailAttribute = attribute;

                return detailObj;
            });
        }
        else
            attribute.objects = [];

        attribute.backupBeforeEdit = function () {
            this._backup = copyProperties(this, ["isReadOnly", "isValueChanged", "validationError", "visibility"], true);
        };

        attribute.restoreEditBackup = function () {
            for (var name in this._backup)
                this[name] = this._backup[name];

            this._backup = {};

            this.objects = this.objects.filter(function (obj) { return !obj.isNew; });
            this.objects.forEach(function (obj) {
                obj._isDeleted = false;
            });
        };

        return attribute;
    }

    attribute.isEditable = attribute.getTypeHint('IsEditable', 'False') == 'True';

    attribute.hasValue = function () {
        /// <summary>Provides the ability to check if a Persistent Object Attribute with Reference has a Value.</summary>
        /// <returns type="Boolean">Returns true if the refrence has a value; otherwise false.</returns>

        return this.objectId != null;
    };

    attribute.browseReference = function (onCompleted, useCurrentItems) {
        if (this.isReadOnly || isDialogOpen)
            return;

        this.lookup.parent = this.parent;
        isDialogOpen = true;

        var self = this;
        this._showDialog(this.lookup, function (selectedItems) { self.changeReference(selectedItems, onCompleted); }, useCurrentItems);
    };

    attribute.onChanged = function (obj, lostFocus, onBrowseReferenceCompleted) {
        if (lostFocus && this.isEditable && (this.value || "") != obj.value) {
            var attr = this;
            var onCompleted = function () {
                var displayColumn = attr.lookup.getColumn(attr.displayAttribute);
                if (displayColumn != null) {
                    displayColumn.includes = ["1|@" + obj.value];

                    attr.lookup.textSearch = "";
                    attr.lookup.search(function () {
                        if (attr.lookup.items.length != 1) {
                            var isZero = attr.lookup.items.length == 0;
                            if (isZero) {
                                displayColumn = attr.lookup.getColumn(attr.displayAttribute);
                                if (displayColumn != null)
                                    displayColumn.includes = null;
                            }

                            attr.browseReference(onBrowseReferenceCompleted, !isZero);
                        }
                        else
                            attr.changeReference(attr.lookup.items, onBrowseReferenceCompleted);
                    });
                }
            };

            if (this.lookup.columns.length == 0)
                this.lookup.search(onCompleted);
            else
                onCompleted();
        }
    };

    attribute.changeReference = function (selectedItems, onChanged) {
        /// <summary>Changes the reference value of the Persistent Object Attribute.</summary>
        /// <param name="onChanged" type="Function">A function that will be called when the value has been changed.</param>

        isDialogOpen = false;

        if (this.isReadOnly)
            return;

        var self = this;
        this.parent.attributes.filter(function (a) { return a.id != self.id; }).forEach(function (a) { a._refreshValue = a.value; });
        app.gateway.executeAction("PersistentObject.SelectReference", this.parent, this.lookup, selectedItems, [{ PersistentObjectAttributeId: this.id }],
            function (result) {
                self.parent.refreshFromResult(result);

                if (typeof (onChanged) == "function")
                    onChanged();
            },
            function (error) {
                self.parent.showNotification(error, "Error");
            });
    };

    attribute.clearReference = function (onCompleted) {
        /// <summary>Clears the reference value of the Persistent Object Attribute.</summary>
        /// <param name="onCompleted" type="Function">A function that will be called when the value has been cleared.</param>

        this.changeReference([], onCompleted);
    };

    attribute.addNewReference = function () {
        /// <summary>Start adding a new reference as the value for the Persistent Object Attribute with Reference. This funtion will open a new Persistent Object in the user interface that, when saved, will be used as value. This method does nothing when the Persist Object Attribute is ReadOnly</summary>

        if (this.isReadOnly)
            return;

        var self = this;
        app.gateway.executeAction("Query.New", this.parent, this.lookup, null, [{ PersistentObjectAttributeId: this.id }],
            function (po) {
                po.ownerAttributeWithReference = self;
                app.openPersistentObject(po, true);
            },
            function (error) {
                self.parent.showNotification(error, "Error");
            });
    };

    attribute.navigateToReference = function () {
        /// <summary>Navigates the user interface to the value of the Persistent Object Attribute. Only usable on a Persistent Object Attribute with Reference.</summary>

        if (this.lookup.canRead)
            app.gateway.getPersistentObject(this.parent, this.lookup.persistentObject.id, this.objectId, function (result) {
                app.openPersistentObject(result);
            });
    };

    attribute.canRemoveReference = function () {
        /// <summary>Returns a value that indicates if a reference can be removed. Only usable on a Persistent Object Attribute with Reference.</summary>
        /// <returns type="Boolean">Return a Boolean that indicates if a reference can be removed.</returns>

        return !this.isRequired && this.objectId != null && !this.isReadOnly;
    };

    attribute._showDialog = function (query, onSelectValue, useCurrentItems) {
        var _this = this;

        var action = new SelectReferenceDialogActions(query, 1, onSelectValue, function () { isDialogOpen = false; });
        if (this.canAddNewReference) {
            var newAction = Actions.getAction("New", query);
            newAction.isPinned = true;
            newAction.onExecute = function() {
                action.closeDialog();

                _this.addNewReference();
            };
            query.actions.push(newAction);
        }
        action.showDialog(useCurrentItems);
    };

    return attribute;
}

PersistentObjectAttribute.prototype.backupBeforeEdit = function () {
    this._backup = copyProperties(this, ["value", "isReadOnly", "isValueChanged", "options", "objectId", "validationError", "visibility"], true);
};

PersistentObjectAttribute.prototype.binaryFileName = function () {
    /// <summary>Returns the binary filename or an empty string when no filename is present.</summary>
    /// <returns type="String">Returns the filename for the binary file.</returns>

    if (!isNullOrWhiteSpace(this.value)) {
        var index = this.value.lastIndexOf('|');
        if (index >= 0)
            return this.value.substring(0, index);
    }

    return "";
};

PersistentObjectAttribute.prototype.createElement = function (columnSpan, tabColumnCount) {
    /// <summary>Creates a jQuery object that represents the Persistent Object Attribute.</summary>
    /// <param name="columnSpan" type="Number">the columnSpan that the JQuery object should use.</param>
    /// <param name="tabColumnCount" type="Number">the total number of columns that is available on the tab this element will be placed.</param>
    /// <returns type="jQuery" />

    var div = $.createElement('div').addClass('persistenObjectAttributeSectionColumn').css("width", (1 / tabColumnCount) * columnSpan * 100 + '%');
    var label = $.createElement('label').addClass("persistentObjectAttributeLabel").attr("data-vidyano-attribute", this.name);
    div.append(label);

    if (!isNullOrWhiteSpace(this.toolTip)) {
        var tt = $.createElement('div').addClass("persistentObjectAttributeToolTip").html("&nbsp;");
        div.append(tt);

        tt.toolTip(this.toolTip, null, ".resultContent" + (this.parent.isMasterDetail() ? ".persistentObjectAttributes" : ""));
    }

    var control = this._createControl();
    div.append(control);

    var options = {};
    var hasOptions = false;
    var foreground = this.getTypeHint("Foreground", null);
    if (!isNullOrEmpty(foreground)) {
        options.color = foreground;
        hasOptions = true;
    }

    var fontWeight = this.getTypeHint("FontWeight", null);
    if (!isNullOrEmpty(fontWeight)) {
        options['font-weight'] = foreground.toLowerCase();
        hasOptions = true;
    }

    if (hasOptions)
        control.css(options);

    return div;
};

PersistentObjectAttribute.prototype.displayValue = function () {
    /// <summary>Returns the formatted value that can be used to display the value on the user interface.</summary>
    /// <returns type="String">Returns the formatted display value.</returns>

    var format = this.getTypeHint("DisplayFormat", "{0}");

    var value = ServiceGateway.fromServiceString(this.value, this.type);
    if (value != null && (this.type == "Boolean" || this.type == "NullableBoolean"))
        value = app.getTranslatedMessage(value ? this.getTypeHint("TrueKey", "True") : this.getTypeHint("FalseKey", "False"));
    else if (this.type == "YesNo")
        value = app.getTranslatedMessage(value ? this.getTypeHint("TrueKey", "Yes") : this.getTypeHint("FalseKey", "No"));
    else if (this.type == "KeyValueList") {
        if (this.options != null && this.options.length > 0) {
            var str = value != null ? value + "=" : "=";
            var option = this.options.firstOrDefault(function (o) { return o.startsWith(str); });
            if (option != null)
                value = option.substring(str.length);
            else if (this.isRequired)
                value = "";
        }
    }
    else if (value != null && (this.type == "Time" || this.type == "NullableTime")) {
        value = value.trimEnd('0').trimEnd('.');
        if (value.startsWith('0:'))
            value = value.substr(2);
        if (value.endsWith(':00'))
            value = value.substr(0, value.length - 3);
    }

    if (format == "{0}") {
        if (this.type == "Date" || this.type == "NullableDate")
            format = "{0:" + CultureInfo.currentCulture.dateFormat.shortDatePattern + "}";
        else if (this.type == "DateTime" || this.type == "NullableDateTime")
            format = "{0:" + CultureInfo.currentCulture.dateFormat.shortDatePattern + " " + CultureInfo.currentCulture.dateFormat.shortTimePattern + "}";
    }

    var text = $.createElement("span").text(value != null ? String.format(format, value) : "").html();
    if ((this.type == "String" || this.type == "MultiLineString" || this.type == "TranslatedString") && value != null) {
        if (this.getTypeHint("Language") != null)
            return "<pre>" + text + "</pre>";

        text = text.replace(/\r?\n|\r/g, "<br/>").replace(/\s(?=\s)/g, "&nbsp;");
    }

    return text;
};

PersistentObjectAttribute.prototype.getTypeHint = function (name, defaultValue, typeHints) {
    /// <summary>Get the specified type hint or return the defaultValue if not found.</summary>
    /// <param name="name" type="String">The name of the type hint, casing doesn't matter.</param>
    /// <param name="defaultValue">The optional default value that should be used when the type hint wasn't found.</param>
    /// <param name="typeHints">The optional typeHints for the specific instance.</param>
    /// <returns type="String" />

    if (typeHints != null) {
        if (this.typeHints != null)
            typeHints = $.extend({}, typeHints, this.typeHints);
    }
    else
        typeHints = this.typeHints;

    if (typeHints != null) {
        var typeHint = typeHints[name];
        if (typeHint == null) {
            // NOTE: Look again case-insensitive
            var lowerName = name.toLowerCase();
            for (var prop in typeHints) {
                if (lowerName == prop.toLowerCase()) {
                    typeHint = typeHints[prop];
                    break;
                }
            }
        }

        if (typeHint != null)
            return typeHint;
    }

    return defaultValue;
};

PersistentObjectAttribute.prototype.isVisible = function () {
    /// <summary>Gets a value indicating that the Persistent Object Attribute should be visible.</summary>
    /// <returns type="Boolean" />

    return this.visibility != null && (this.visibility.contains("Always") || this.visibility.contains(this.parent.isNew ? "New" : "Read"));
};

PersistentObjectAttribute.prototype.onChanged = function (obj, lostFocus) {
    /// <summary>Changes the attribute with the value from the object that was supplied. When lostFocus is true, The persistent object attribute will execute TriggersRefresh when needed. If lostFocus is false, it will queue the call to TriggersRefresh. </summary>
    /// <param name="obj">The object that has the new value as a value property. Object should contain at least a value property.</param>
    /// <returns>The new value.</returns>

    if (this.isReadOnly)
        return this.value;

    if (this.type == "Image" || this.type == "BinaryFile") {
        // NOTE: Special case for file uploads, the actual data isn't available yet
        this.isValueChanged = true;

        if (this.bulkEditCheckbox != null && this.parent.isInBulkEditMode())
            this.bulkEditCheckbox.prop("checked", this.isValueChanged);
        this.value = obj.value;

        this.parent.isDirty(true);

        return this.value;
    }

    var serviceString = obj.value;
    if (!isNullOrEmpty(serviceString))
        serviceString = ServiceGateway.toServiceString(serviceString, this.type);

    var currentServiceValue = this.value;
    if ((currentServiceValue == null && isNullOrEmpty(serviceString)) || this.value == serviceString || currentServiceValue == serviceString) {
        if (lostFocus && this._queueTriggersRefresh)
            this.triggerRefresh();

        return obj.value;
    }

    this.value = serviceString;
    this.isValueChanged = true;

    if (this.bulkEditCheckbox != null && this.parent.isInBulkEditMode())
        this.bulkEditCheckbox.prop("checked", this.isValueChanged);

    if (this.triggersRefresh) {
        if (lostFocus)
            this.triggerRefresh();
        else
            this._queueTriggersRefresh = true;
    }

    this.parent.isDirty(true);
    return obj.value;
};

PersistentObjectAttribute.prototype.restoreEditBackup = function () {
    for (var name in this._backup)
        this[name] = this._backup[name];

    this._backup = {};
};

PersistentObjectAttribute.prototype.selectInPlaceOptions = function () {
    /// <summary>Returns all the possible options that can be used for the selectInPlace. This will include an empty item when the Peristent Object Attribute is not required.</summary>
    /// <returns type="Array">Returns an array containing key/value objects for the options.</returns>

    var result = !this.isRequired ? [{ key: null, value: "" }] : [];
    return result.concat(this.options.map(function (o) {
        var parts = o.split("=", 2);
        return { key: parts[0], value: parts[1] };
    }));
};

PersistentObjectAttribute.prototype.setValue = function (value) {
    /// <summary>Sets the value of the Persistent Object Attribute.</summary>
    /// <param name="value">The value to set as the new value for the Persistent Object Attribute.</param>
    /// <returns>The new value.</returns>

    return this.onChanged({ value: value }, true);
};

PersistentObjectAttribute.prototype.toServiceObject = function () {
    /// <summary>Creates an optimized copy that can be sent to the service.</summary>
    /// <returns type="Object" />

    var result = copyProperties(this, ["id", "name", "value", "label", "options", "type", "isReadOnly", "triggersRefresh", "isRequired", "differsInBulkEditMode", "isValueChanged", "displayAttribute", "objectId", "visibility"]);

    if (this.objects != null) {
        result.asDetail = true;
        result.objects = this.objects.map(function (obj) {
            var detailObj = obj.toServiceObject(true);
            if (obj._isDeleted)
                detailObj.isDeleted = true;

            return detailObj;
        });
    }

    return result;
};

PersistentObjectAttribute.prototype.toString = function () {
    return "PersistentObjectAttribute " + this.name + "=" + ServiceGateway.fromServiceString(this.value, this.type);
};

PersistentObjectAttribute.prototype.triggerRefresh = function (onCompleted, onError) {
    /// <summary>Executing this method will call the Refresh function on the service. the Persistent Object will be refreshed with the new values.</summary>

    var parameters = [{ RefreshedPersistentObjectAttributeId: this.id }];

    this._queueTriggersRefresh = false;
    this.parent._isAttributeRefreshing = true;
    var self = this;
    this.parent.attributes.filter(function (a) { return a.id != self.id; }).forEach(function (a) { a._refreshValue = a.value; });
    app.gateway.executeAction("PersistentObject.Refresh", this.parent, null, null, parameters, function (result) {
        self.parent.refreshFromResult(result);
        self.parent._isAttributeRefreshing = false;

        if (typeof (self.parent._queueSave) == "function")
            self.parent._queueSave();

        if (typeof (onCompleted) == "function")
            onCompleted();
    }, function (e) {
        self.parent._isAttributeRefreshing = false;

        if (typeof (self.parent._queueSave) == "function")
            self.parent._queueSave(e);

        if (typeof (onError) == "function")
            onError(e);
        else
            self.parent.showNotification(e, "Error");
    });
};

PersistentObjectAttribute.prototype.updateControlElement = function (element, updateExisting) {
    if (updateExisting)
        element.empty();

    element.dataContext(this);
    element.append(this._getTemplate());

    if (!isNullOrWhiteSpace(this.validationError)) {
        var validationErrorDiv = $.createElement("div").text(this.validationError);
        validationErrorDiv.addClass("persistentObjectAttributeValidationErrorMessage");
        element.append(validationErrorDiv);

        element.addClass("persistentObjectAttributeValidationError");
    }
    else
        element.removeClass("persistentObjectAttributeValidationError");

    element.addClass("persistentObjectAttributeControl");

    if (updateExisting)
        this.parent._postAttributeRender(element);
};

PersistentObjectAttribute.prototype.updateLabelElement = function (element, updateExisting) {
    if (updateExisting)
        element.empty();

    element.dataContext(this);
    element.append(this.label);

    if (this.parent.inEdit && this.isRequired)
        element.addClass("persistentObjectAttributeRequiredLabel");
    else
        element.removeClass("persistentObjectAttributeRequiredLabel");

    element.addClass("persistentObjectAttributeLabel");
};

PersistentObjectAttribute.prototype._createControl = function () {
    var control = $.createElement('div').addClass("persistentObjectAttributeControl").attr("data-vidyano-attribute", this.name);

    if (this.parent.isInBulkEditMode()) {
        var currentPoa = this;
        var outerDiv = $.createElement('div', this);
        this.bulkEditCheckbox = $.createInput("checkbox").addClass("persistentObjectAttributeBulkEditCheckbox")
            .on("change", function () {
                currentPoa.isValueChanged = currentPoa.bulkEditCheckbox[0].checked;
            });

        if (this.isReadOnly)
            this.bulkEditCheckbox.attr("disabled", "disabled");

        if (this.isValueChanged)
            this.bulkEditCheckbox[0].checked = true;

        outerDiv.append(this.bulkEditCheckbox, control);
        return outerDiv;
    }

    return control;
};

PersistentObjectAttribute.prototype._getTemplate = function () {
    var template = app.templates[this.parent.inEdit && !this.isReadOnly ? this.editTemplateKey : this.templateKey];
    if (this.value == null)
        this.value = null;

    var renderedTemplate;
    if (template == null || isNullOrWhiteSpace(template.data))
        renderedTemplate = "<span class='persistenObjectAttributeTemplateNotFound'>Template for type " + this.type + " is empty.</span>";
    else {
        try {
            renderedTemplate = template.data(this);
        } catch (e) {
            renderedTemplate = "<span>Error occured while rendering template: " + (e.message || e) + "</span>";
        }
    }

    return renderedTemplate;
};