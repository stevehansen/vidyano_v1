/// <reference path="/Scripts/jquery-1.8.1.min.js" />
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
    this.selectionRule = ExpressionParser.get(item.getValue("SelectionRule"));
    this.refreshQueryOnCompleted = item.getValue("RefreshQueryOnCompleted") || false;

    var icon = item.getFullValue("Icon");
    this.icon = icon != null ? icon.objectId : null;

    var options = item.getValue("Options");
    this.options = !isNullOrWhiteSpace(options) ? options.split(";") : [];
}

function ActionBase(definition) {
    /// <summary>Creates a new instance of ActionBase.</summary>
    /// <param name="definition" type="ActionDefinition">The definition that is used to base this Action on.</param>
    
    this._canExecute = definition.selectionRule(0);
    this._isVisible = true;

    this.id = definition.id;
    this.name = definition.name;
    this.displayName = definition.displayName;
    this.isPinned = definition.isPinned;
    this.selectionRule = definition.selectionRule;
    this.refreshQueryOnCompleted = definition.refreshQueryOnCompleted;
    this.icon = definition.icon;
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

        var element = $("#Action_" + this.name);
        if (element.length > 0 && element.dataContext() == this)
            element.css({ opacity: value ? 1 : 0.5 });
    }

    return this;
};

ActionBase.prototype.execute = function (option, continueWith, parameters) {
    if (this.canExecute()) {
        app.trackEvent(this.name, option, this.query || this.parent);

        try {
            this.onExecute(option, continueWith, parameters);
        } catch (e) {
            this.showNotification(e.message || e, "Error");
        }
    }
};

ActionBase.prototype.isVisible = function (value) {
    if (typeof (value) == "undefined")
        return this._isVisible;

    if (this._isVisible != value) {
        this._isVisible = value;

        var element = $("#Action_" + this.name);
        if (element.length > 0 && element.dataContext() == this) {
            if (value)
                element.show();
            else
                element.hide();
        }
    }

    return this;
};

ActionBase.prototype.onExecute = function (option, continueWith, parameters) {
    parameters = this._getParameters(parameters, option);

    var self = this;
    var selectedItems = this.query != null && this.query.items != null ? this.query.items.selectedItems() : null;
    var onCompleted = function (po) {
        if (po != null) {
            if (po.fullTypeName == "Vidyano.Notification") {
                self.showNotification(po.notification, po.notificationType);
            } else if (!isNullOrWhiteSpace(po.notification) && po.notificationType == "Error") {
                self.showNotification(po.notification, "Error");

                if (self.parent != null && (po.fullTypeName == self.parent.fullTypeName || po.isNew == self.parent.isNew) && po.id == self.parent.id && po.objectId == self.parent.objectId)
                    self.parent.refreshFromResult(po);
            } else if (po.fullTypeName == "Vidyano.RegisteredStream") {
                app.gateway.getStream(po);
            } else if (self.parent == null || ((po.fullTypeName != self.parent.fullTypeName && po.isNew != self.parent.isNew) || po.id != self.parent.id || po.objectId != self.parent.objectId)) {
                po.ownerQuery = self.query;
                app.openPersistentObject(po, true);
            } else {
                self.parent.refreshFromResult(po);
                self.parent.showNotification(po.notification, po.notificationType);
            }
        }
        else if (self.query != null && self.refreshQueryOnCompleted)
            self.query.search();

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

ActionBase.prototype.onInitialize = function () {};

ActionBase.prototype.render = function () {
    var content = $.createElement("li", this);
    content.attr({ id: "Action_" + this.name, title: this.label });
    var label = $.createElement("span");
    label.text(this.displayName);

    if (this.icon != null) {
        var icon = app.icons[this.icon];
        if (icon != null && !isNullOrWhiteSpace(icon.data)) {
            var img = $.createElement("img");
            img.attr({ src: icon.data.asDataUri(), alt: "Icon", title: this.displayName });

            content.append(img);
        }
    }
    else {
        content.append($.createElement("div").addClass("defaultActionButton"));
    }

    content.append(label);

    if (!this.canExecute())
        content.css({ opacity: 0.5 });

    if (this.options.length == 0)
        content.click(function (e) {
            $(this).dataContext().execute("-1");
            e.stopPropagation();
        });
    else {
        var optionsList = $.createElement("ul", this).addClass("actionOptions");

        this.options.run(function (option, idx) {
            var optionSelector = $.createElement("li");
            optionSelector.text(option);
            optionSelector.click(function (e) {
                $(this).dataContext().execute(idx.toString());
                e.stopPropagation();
            });

            optionsList.append(optionSelector);
        });

        content.subMenu(optionsList);
    }

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
            actionsQuery.items.run(function (a) {
                var definition = new ActionDefinition(a);
                actions.actionDefinitions[definition.name] = definition;
            });
        },

        getAction: function (actionName, owner) {
            /// <summary>Gets the specified action for the specified owner.</summary>
            /// <param name="actionName" type="String">The name of the action.</param>
            /// <returns type="ActionBase" />

            if (actionName == "Edit" && owner != null && owner.constructor == PersistentObject && owner.isNew)
                actionName = "Save";

            var definition = actions.actionDefinitions[actionName];
            if (definition == null)
                return null;

            var actionType = actions.actionTypes[actionName];
            var result = actionType != null ? actionType(definition) : new ActionBase(definition);

            if (owner != null) {
                if (owner.constructor == Query) {
                    result.target = "Query";
                    result.query = owner;
                    result.parent = owner.parent;
                    if (actionName == "New" && owner.persistentObject != null && !isNullOrWhiteSpace(owner.persistentObject.newOptions))
                        result.options = owner.persistentObject.newOptions.split(";");
                }
                else if (owner.constructor == PersistentObject) {
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

            actionNames.run(function (actionName) {
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

            var normalActions = target.find('.normalActions');
            var pinnedActions = target.find('.pinnedActions');

            if (normalActions.length == 0 || pinnedActions.length == 0) {
                target.empty();

                normalActions = $.createElement("ul").addClass("normalActions");
                var normalActionsContainer = $("<div>").append(normalActions);
                normalActionsContainer.overflow($("<li class='overflowActionsButton'><div></div><span>&nbsp;&nbsp;&nbsp;</span></li>"), "overflowActions");

                pinnedActions = $.createElement("ul").addClass("pinnedActions");

                target.autoSizePanel([normalActionsContainer, pinnedActions], 0);
            }
            else {
                normalActions.empty();
                pinnedActions.empty();
            }

            if (allActions != null) {
                allActions.run(function (a) {
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

            app.gateway.executeAction("PersistentObject.ShowHelp", owner, null, null, null, function (po) {
                if (po != null) {
                    if (po.getAttributeValue("Type") == "0")
                        app.gateway.getStream(po);
                    else {
                        var helpWindow = window.open(po.getAttributeValue("Document"));
                        if (helpWindow && helpWindow.top) {
                            // Success
                        }
                        else {
                            // Popup blocked
                            result.showNotification("Your browser blocked the window for showing the documentation.", "Notice");
                        }
                    }
                }
            }, function (error) {
                action.showNotification(error);
            });
        };

        return result;
    };

    actions.actionTypes["Delete"] = function (definition) {
        var result = new ActionBase(definition);

        result.baseOnExecute = result.onExecute;
        result.onExecute = function (option) {
            var d = $.createElement("div");
            d.html(app.getTranslatedMessage("AskForDeleteItems"));

            var buttons = {};
            buttons[app.getTranslatedMessage("Delete")] = function () {
                $(this).dialog("close");
                d.remove();
                result.baseOnExecute(option);
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
            result.parent.editMode(true);
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
                    window.history.back();
                    if (wasNew && result.parent.stateBehavior != null && result.parent.stateBehavior.contains("OpenAfterNew")) {
                        app.gateway.getPersistentObject(result.parent.parent, result.parent.id, result.parent.objectId, function (r) {
                            app.openPersistentObject(r);
                        });
                    }
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
            var selectedItems = this.query != null && this.query.items != null ? this.query.items.selectedItems() : null;
            app.gateway.getStream(null, this.target + "." + this.name, this.parent, this.query, selectedItems, parameters);
        };

        return result;
    };

    return actions;
})(window);