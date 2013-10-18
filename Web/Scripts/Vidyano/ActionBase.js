/// <reference path="/Scripts/jquery-2.0.0.min.js" />
/// <reference path="Common.js" />
/// <reference path="jQuery.js" />
/// <reference path="ExpressionParser.js" />
/// <reference path="Application.js" />
/// <reference path="ServiceGateway.js" />
/// <reference path="PersistentObject.js" />
/// <reference path="Query.js" />
/// <reference path="QueryResultItem.js" />
/// <reference path="Controls/QueryGrid.js" />
/// <reference path="SelectReferenceDialogActions.js" />

function ActionDefinition(item) {
    /// <summary>Creates a new instance of ActionDefinition.</summary>
    /// <param name="item" type="QueryResultItem">The query result item containing the information about the action.</param>

    this.id = item.id;
    this.name = item.getValue("Name");
    this.displayName = item.getValue("DisplayName");
    this.isPinned = item.getValue("IsPinned") == "True";
    this.isInline = false;
    this.inlineOnly = false;
    this.selectionRule = ExpressionParser.get(item.getValue("SelectionRule"));
    this.refreshQueryOnCompleted = item.getValue("RefreshQueryOnCompleted") == "True";

    var icon = item.getFullValue("Icon");
    this.icon = icon != null ? icon.objectId : null;

    var options = item.getValue("Options");
    this.options = !isNullOrWhiteSpace(options) ? options.split(";") : [];

    if (icon != null) {
        var appIcon = app.icons[this.icon];
        if (appIcon == null || isNullOrWhiteSpace(appIcon.data))
            return;

        var iconWidth = 20, iconHeight = 20;
        var img = new Image();
        img.width = iconWidth;
        img.height = iconHeight;
        var self = this;
        img.onload = function () {
            var canvas = $("<canvas>").attr({
                "height": iconHeight,
                "width": iconWidth
            });
            var canvasContext = canvas[0].getContext("2d");
            canvasContext.drawImage(img, 0, 0, iconWidth, iconHeight);

            var imgd = canvasContext.getImageData(0, 0, iconWidth, iconHeight);
            var pix = imgd.data;

            for (var i = 0, n = pix.length; i < n; i += 4) {
                pix[i] = 255 - pix[i];
                pix[i + 1] = 255 - pix[i + 1];
                pix[i + 2] = 255 - pix[i + 2];
            }

            canvasContext.putImageData(imgd, 0, 0);

            self.reverseIconData = canvas[0].toDataURL("image/png");
            self.reverseIconClass = self.name + "ReversedActionIcon";
            self.reverseIconClassRule = $.rule("." + self.reverseIconClass + " { background-image: url(" + self.reverseIconData + "); width: " + img.width + "px; height: " + img.height + "px; }").appendTo("style");

            self.iconClass = self.name + "ActionIcon";
            self.iconClassRule = $.rule("." + self.iconClass + " { background-image: url(" + img.src + "); width: " + img.width + "px; height: " + img.height + "px; }").appendTo("style");

            canvas.remove();
        };
        img.src = appIcon.data.asDataUri();
    }
    else
        this.reverseIconData = null;
}

function ActionBase(definition) {
    /// <summary>Creates a new instance of ActionBase.</summary>
    /// <param name="definition" type="ActionDefinition">The definition that is used to base this Action on.</param>

    this._canExecute = definition.selectionRule(0);
    this._isVisible = true;
    this._isInline = definition.isInline;

    this.id = definition.id;
    this.name = definition.name;
    this.displayName = definition.displayName;
    this.isPinned = definition.isPinned;
    this.inlineOnly = definition.inlineOnly;
    this.selectionRule = definition.selectionRule;
    this.hasSelectionRule = this.selectionRule != ExpressionParser.alwaysTrue;
    this.refreshQueryOnCompleted = definition.refreshQueryOnCompleted;
    this.iconClass = definition.iconClass;
    this.icon = definition.icon;
    this.reverseIconClass = definition.reverseIconClass;
    this.reverseIconData = definition.reverseIconData;
    this.options = definition.options;
    this.parameters = {};
    this.dependentActions = [];

    this.target = null;
    this.parent = null;
    this.query = null;
}

ActionBase.prototype.canExecute = function (value) {
    if (typeof (value) == "undefined")
        return this._canExecute;

    if (this._canExecute != value) {
        this._canExecute = value;

        if (this.content != null && this.content.dataContext() == this)
            this.content.css({ opacity: value ? 1 : 0.5, cursor: value ? "" : "default" });
    }

    return this;
};

ActionBase.prototype.execute = function (option, continueWith, parameters, selectedItems) {
    if (this.canExecute() || (selectedItems != null && this.selectionRule(selectedItems.length))) {
        app.trackEvent(this.name, option, this.query || this.parent);

        try {
            this.onExecute(option, continueWith, parameters, selectedItems);
        } catch (e) {
            this.showNotification("JavaScript: " + (e.message || e), "Error");
        }
    }
};

ActionBase.prototype.isVisible = function (value) {
    if (typeof (value) == "undefined")
        return this._isVisible && !this.inlineOnly;

    if (this._isVisible != value) {
        this._isVisible = value;

        if (this.content != null && this.content.dataContext() == this) {
            if (value && !this.inlineOnly)
                this.content.show();
            else
                this.content.hide();
        }
    }

    return this;
};

ActionBase.prototype.isInline = function (value) {
    if (typeof (value) == "undefined")
        return this._isInline;

    if (this._isInline != value)
        this._isInline = value;

    return this;
};

ActionBase.prototype.onExecute = function (option, continueWith, parameters, selectedItems) {
    parameters = this._getParameters(parameters, option);

    var self = this;
    if (typeof (selectedItems) == "undefined")
        selectedItems = this.query != null && this.query.items != null ? this.query.items.selectedItems() : null;

    var onCompleted = function (po) {
        if (po != null) {
            if (po.fullTypeName == "Vidyano.Notification") {
                if (po.objectId != null && JSON.parse(po.objectId).dialog) {
                    self.showNotification();

                    $.messageBox({
                        message: po.notification,
                        title: po.notificationType,
                        html: true
                    });
                }
                else
                    self.showNotification(po.notification, po.notificationType);
            } else if (po.fullTypeName == "Vidyano.RegisteredStream") {
                app.gateway.getStream(po);
            } else if (self.parent != null && (po.fullTypeName == self.parent.fullTypeName || po.isNew == self.parent.isNew) && po.id == self.parent.id && po.objectId == self.parent.objectId) {
                // Refresh existing
                self.parent.refreshFromResult(po);
                self.parent.showNotification(po.notification, po.notificationType);
            } else {
                // Open new result
                po.ownerQuery = self.query;
                po.ownerPersistentObject = self.parent;
                app.openPersistentObject(po, true);
            }
        }

        if (self.query != null && self.refreshQueryOnCompleted) {
            var notification = self.query.notification;
            if (!String.isNullOrEmpty(notification)) {
                var notificationType = self.query.notificationType;
                
                self.query.search(function() {
                    if (String.isNullOrEmpty(self.query.notification))
                        self.query.showNotification(notification, notificationType);
                });
            }
            else
                self.query.search();

            if (self.query.semanticZoomOwner != null)
                self.query.semanticZoomOwner.search();
        }

        if (continueWith != null)
            continueWith();
    };

    var onCompletedHook = null, onErrorHook = null, onExecuteHook = null;
    var onError = function (error) {
        self.showNotification(error, "Error");
    };

    var executeAction = function () {
        app.gateway.executeAction(self.target + "." + self.name, self.parent, self.query, selectedItems, parameters, function (po) {
            if (onCompletedHook != null)
                onCompletedHook(po, onCompleted, self);
            else
                onCompleted(po);
        }, function (error) {
            if (onErrorHook != null)
                onErrorHook(error, onError, self);
            else
                onError(error);
        });
    };

    var hook = app.onAction[this.name];
    if (hook != null) {
        onExecuteHook = hook.execute;
        onCompletedHook = hook.completed;
        onErrorHook = hook.error;
    }

    var owner = this.query != null ? this.query.persistentObject : this.parent;
    if (!owner.isSystem) {
        var onPo = app.onPersistentObject[owner.type];
        if (onPo != null && onPo.onAction != null) {
            var poHook = onPo.onAction[this.name];
            if (poHook != null) {
                var poExecuteHook = poHook.execute;
                var poCompletedHook = poHook.completed;
                var poErrorHook = poHook.error;

                if (poExecuteHook != null) {
                    if (onExecuteHook != null) {
                        var genericExecuteHook = onExecuteHook;
                        onExecuteHook = function (action, handler, params) {
                            poExecuteHook(action, function () { genericExecuteHook(action, handler, params); });
                        };
                    }
                    else
                        onExecuteHook = poExecuteHook;
                }

                if (poCompletedHook != null) {
                    if (onCompletedHook != null) {
                        var genericCompletedHook = onCompletedHook;
                        onCompletedHook = function (po, handler, action) {
                            poCompletedHook(po, function () { genericCompletedHook(po, handler, action); }, action);
                        };
                    }
                    else
                        onCompletedHook = poCompletedHook;
                }

                if (poErrorHook != null) {
                    if (onErrorHook != null) {
                        var genericErrorHook = onErrorHook;
                        onErrorHook = function (error, handler, action) {
                            poErrorHook(error, function () { genericErrorHook(error, handler, action); }, action);
                        };
                    }
                    else
                        onErrorHook = poErrorHook;
                }
            }
        }
    }

    if (typeof (onExecuteHook) == "function")
        onExecuteHook(this, executeAction, parameters);
    else
        executeAction();
};

ActionBase.prototype.onInitialize = function () { };

ActionBase.prototype.render = function () {
    var content = $.createElement("li", this);
    content.attr({ title: this.label });
    var label = $.createElement("span");
    label.text(this.displayName);

    if (this.icon != null) {
        var icon = app.icons[this.icon];
        if (icon != null && !isNullOrWhiteSpace(icon.data)) {
            var border = $.createElement("div").addClass("icon");
            border.css("background-image", "url(" + icon.data.asDataUri() + ")");

            //var img = $.createElement("img");
            //img.attr({ src: icon.data.asDataUri(), alt: "Icon", title: this.displayName });

            content.append(border);
        }
    }
    else {
        content.append($.createElement("div").addClass("icon"));
    }

    content.append(label);

    if (!this.canExecute())
        content.css({ opacity: 0.5, cursor: "default" });

    if (this.options.length == 0)
        content.click(function (e) {
            $(this).dataContext().execute("-1");
            e.stopPropagation();
        });
    else {
        var optionsList = $.createElement("ul", this).addClass("actionOptions");

        this.options.forEach(function (option, idx) {
            var optionSelector = $.createElement("li");
            optionSelector.text(option);
            optionSelector.click(function () {
                $(this).dataContext().execute(idx.toString());
            });

            optionsList.append(optionSelector);
        });

        content.subMenu(optionsList);
    }

    this.content = content;
    return content;
};

ActionBase.prototype.showNotification = function (notification, notificationType) {
    if (this.query != null)
        this.query.showNotification(notification, notificationType);
    else
        this.parent.showNotification(notification, notificationType);
};

ActionBase.prototype._getParameters = function (parameters, option) {
    if (parameters == null)
        parameters = {};
    if (this.parameters != null)
        parameters = $.extend({}, this.parameters, parameters);
    if (this.query != null && this.query.filterDisplayName != null)
        parameters["QueryFilterName"] = this.query.filterDisplayName;
    if (this.options != null && this.options.length > 0 && option >= 0) {
        parameters["MenuOption"] = option;
        parameters["MenuLabel"] = this.options[option];
    }
    else if (option != null)
        parameters["MenuOption"] = option;
    return parameters;
};

var Actions = (function (window) {
    var actions = {
        actionDefinitions: {},
        actionTypes: {},

        initializeActions: function (actionsQuery) {
            actionsQuery.items.forEach(function (a) {
                var definition = new ActionDefinition(a);
                actions.actionDefinitions[definition.name] = definition;
            });
        },

        getAction: function (actionName, owner) {
            /// <summary>Gets the specified action for the specified owner.</summary>
            /// <param name="actionName" type="String">The name of the action.</param>
            /// <returns type="ActionBase" />

            if (actionName == "Edit" && owner != null && owner instanceof PersistentObject && owner.isNew)
                actionName = "Save";

            var definition = actions.actionDefinitions[actionName];
            if (definition == null)
                return null;

            var actionType = actions.actionTypes[actionName];
            var result = actionType != null ? actionType(definition) : new ActionBase(definition);

            if (owner != null) {
                if (owner instanceof Query) {
                    result.target = "Query";
                    result.query = owner;
                    result.parent = owner.parent;
                    if (actionName == "New" && owner.persistentObject != null && !String.isNullOrEmpty(owner.persistentObject.newOptions))
                        result.options = owner.persistentObject.newOptions.split(";");
                }
                else if (owner instanceof PersistentObject) {
                    result.target = "PersistentObject";
                    result.parent = owner;
                    result.canExecute(true);
                }

                result.onInitialize();
            }

            return result;
        },

        getActions: function (actionNames, owner) {
            /// <summary>Gets the specified actions for the specified owner.</summary>
            /// <param name="actionName" type="Array">The names of the actions.</param>

            var result = [];
            actions.addActions(result, actionNames, owner);
            return result;
        },

        addActions: function (result, actionNames, owner) {
            if (actionNames == null || actionNames.length == 0)
                return;

            actionNames.forEach(function (actionName) {
                var action = actions.getAction(actionName, owner);
                if (action != null) {
                    result.push(action);
                    result[action.name] = action;

                    actions.addActions(result, action.dependentActions, owner);
                }
            });
        },

        showActions: function (allActions, target) {
            /// <summary>Is used to show or hide the actions based on the specified argument.</summary>
            if (target == null)
                return;

            if ($.mobile) {
                target.on("resize", function () {
                    var actionBarHeight = target.outerHeight(true);
                    $("#content").css("padding-bottom", actionBarHeight + "px");
                });
            }

            var normalActions = target.find('.normalActions');
            var pinnedActions = target.find('.pinnedActions');

            if (normalActions.length == 0 || pinnedActions.length == 0) {
                target.empty();

                normalActions = $.createElement("ul").addClass("normalActions");
                pinnedActions = $.createElement("ul").addClass("pinnedActions");

                var normalActionsContainer = $("<div>").append(normalActions);
                normalActionsContainer.overflow($("<li class='overflowActionsButton'><div></div><span>&nbsp;&nbsp;&nbsp;</span></li>"), "overflowActions");
                target.autoSizePanel([normalActionsContainer, pinnedActions], 0);
            }
            else {
                normalActions.empty();
                pinnedActions.empty();
            }

            if (allActions != null) {
                allActions.forEach(function (a) {
                    var element = a.render();
                    if (!a.isPinned)
                        normalActions.append(element);
                    else
                        pinnedActions.append(element);

                    if (!a.isVisible())
                        element.hide();
                });
            }
        }
    };

    actions.actionTypes["RefreshQuery"] = function (definition) {
        var result = new ActionBase(definition);
        result.isVisible(false);

        result.onExecute = function (option, continueWith) {
            var query = result.query;
            if (query != null) {
                query.search(function () {
                    if (continueWith != null)
                        continueWith();
                });
            }
        };

        return result;
    };

    actions.actionTypes["ShowHelp"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            var owner = result.query != null ? result.query.persistentObject : result.parent;

            var helpWindow = window.open();
            app.gateway.executeAction("PersistentObject.ShowHelp", owner, null, null, null, function (po) {
                if (po != null) {
                    if (po.fullTypeName == "Vidyano.RegisteredStream" || po.getAttributeValue("Type") == "0") {
                        app.gateway.getStream(po);
                        helpWindow.close();
                    }
                    else {
                        helpWindow.location = po.getAttributeValue("Document");
                        helpWindow.focus();
                    }
                }
                else
                    helpWindow.close();
            }, function (error) {
                helpWindow.close();
                action.showNotification(error);
            });
        };

        return result;
    };

    actions.actionTypes["Delete"] = function (definition) {
        var result = new ActionBase(definition);

        result.baseOnExecute = result.onExecute;
        result.onExecute = function (option, continueWith, parameters, selectedItems) {
            var d = $.createElement("div");
            d.html(app.getTranslatedMessage("AskForDeleteItems"));

            var buttons = {};
            buttons[app.getTranslatedMessage("Delete")] = function () {
                $(this).dialog("close");
                d.remove();
                result.baseOnExecute(option, continueWith, parameters, selectedItems);
            };

            buttons[app.getTranslatedMessage("Cancel")] = function () {
                $(this).dialog("close");
                d.remove();
            };

            d.dialog({
                title: app.getTranslatedMessage("Delete"),
                resizable: false,
                modal: true,
                width: 400,
                buttons: buttons
            });
        };

        return result;
    };

    actions.actionTypes["Edit"] = function (definition) {
        var result = new ActionBase(definition);
        result.dependentActions = ["EndEdit", "CancelEdit"];

        result.onExecute = function () {
            result.parent.beginEdit();
        };

        return result;
    };

    actions.actionTypes["EndEdit"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            result.parent.save(function () {
                if (isNullOrWhiteSpace(result.parent.notification) || result.parent.notificationType != "Error") {
                    var edit = result.parent.actions["Edit"];
                    var endEdit = result.parent.actions["EndEdit"];
                    var stayInEdit = result.parent.stateBehavior == "StayInEdit" || result.parent.stateBehavior.contains("StayInEdit");

                    if (stayInEdit && endEdit != null) {
                        endEdit.canExecute(false);
                    } else if (edit != null) {
                        edit.isVisible(true);
                        if (endEdit != null) {
                            endEdit.isVisible(false);
                        }
                    }
                }
            });
        };

        result.onInitialize = function () {
            result.isVisible(false);
            result.canExecute(false);
        };

        return result;
    };

    actions.actionTypes["Save"] = function (definition) {
        var result = new ActionBase(definition);
        result.dependentActions = ["CancelSave"];

        result.onExecute = function () {
            var wasNew = result.parent.isNew;
            result.parent.save(function () {
                if (isNullOrWhiteSpace(result.parent.notification) || result.parent.notificationType != "Error") {
                    delete app.pageObjects[result.parent.getPath()];

                    if (wasNew && result.parent.ownerAttributeWithReference == null && result.parent.stateBehavior != null && result.parent.stateBehavior.contains("OpenAfterNew")) {
                        app.gateway.getPersistentObject(result.parent.parent, result.parent.id, result.parent.objectId, function (r) {
                            app.openPersistentObject(r, false, null, true);
                        });
                    }
                    else
                        window.history.back();
                }
            });
        };

        return result;
    };

    actions.actionTypes["CancelSave"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            delete app.pageObjects[result.parent.getPath()];
            window.history.back();
        };

        return result;
    };

    actions.actionTypes["CancelEdit"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            result.parent.cancelEdit();
        };

        result.onInitialize = function () {
            result.canExecute(false);
        };

        return result;
    };

    actions.actionTypes["DialogOk"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            var dialogParent = result.dialogParent;

            if (dialogParent != null) {
                var selectedItems = result.query.items.selectedItems();
                if (dialogParent.maxSelectedItems == -1 || selectedItems.length <= dialogParent.maxSelectedItems) {
                    dialogParent.selectItems(selectedItems);
                }
            }
        };

        return result;
    };

    actions.actionTypes["DialogCancel"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            if (result.dialogParent != null) {
                result.dialogParent.closeDialog();
            }
        };

        return result;
    };

    actions.actionTypes["AddReference"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function () {
            var query = result.query;

            var clone = query.clone(true);
            clone.parent = query.parent;

            var onError = function (error) {
                query.showNotification(error, "Error");
            };

            var onSelectReference = function (selectedItems) {
                app.gateway.executeAction("Query.AddReference", clone.parent, clone, selectedItems, null, function () { query.search(); }, onError);
            };

            var selectReference = new SelectReferenceDialogActions(clone, -1, onSelectReference);
            selectReference.showDialog();
        };

        return result;
    };

    actions.actionTypes["ExportToExcel"] = function (definition) {
        var result = new ActionBase(definition);

        result.onExecute = function (option) {
            var parameters = result._getParameters(option);
            app.gateway.getStream(null, this.target + "." + this.name, this.parent, this.query, null, parameters);
        };

        return result;
    };

    return actions;
})(window);