/// <reference path="Application.js" />
/// <reference path="ActionBase.js" />
/// <reference path="Common.js" />
/// <reference path="PersistentObjectAttribute.js" />
/// <reference path="Query.js" />
/// <reference path="~/Scripts/underscore-min.js" />
/// <reference path="~/Scripts/jquery-1.8.1.min.js" />

function PersistentObject(po) {
    /// <summary>Describes a Persistent Object that defines a single entity and its metadata.</summary>

    changePrototype(po, PersistentObject);

    /// <field name="id" type="String">The unique identifier of this Persistent Object's definition.</field>
    /// <field name="type" type="String">The type name of this Persistent Object.</field>
    /// <field name="label" type="String">The translated label of this Persistent Object.</field>
    /// <field name="fullTypeName" type="String">The full type name including the schema of this Persistent Object.</field>
    /// <field name="queryLayoutMode" type="String">The layout mode used for Queries inside this Persistent Object, can be "MasterDetail" or "FullPage".</field>
    /// <field name="objectId" type="String">The optional identifier of the specific instance of this Persistent Object.</field>
    /// <field name="breadcrumb" type="String">The optional describing breadcrumb of the specific instance of this Persistent Object.</field>
    /// <field name="notification" type="String">The optional notification for this instance.</field>
    /// <field name="notificationType" type="String">The optional notification type for this instance. Can be "Error", "Notice" or "OK".</field>
    /// <field name="isNew" type="Boolean">Determines if the current Persistent Object is a new or existing instance.</field>
    if (po.isNew == null) po.isNew = false;
    /// <field name="isReadOnly" type="Boolean">Determines if the current Persistent Object is a read only instance.</field>
    if (po.isReadOnly == null) po.isReadOnly = false;
    /// <field name="isHidden" type="Boolean">Determines if the current Persistent Object's tab will be shown or not.</field>
    if (po.isHidden == null) po.isHidden = false;

    /// <field name="inEdit" type="Boolean">Determines if the current Persistent Object is in edit mode or not. Use the editMode(val) method to change this property.</field>
    po.inEdit = false;
    po.target = null;
    po.targets = {};
    /// <field name="actionNames" type="Array" elementType="String">Contains the names of the actions that were allowed for this instance.</field>
    po.actionNames = po.actions;
    /// <field name="actions" type="Array" elementType="ActionBase">Contains the actions for this instance.</field>
    /// <field name="attributes" type="Array" elementType="PersistentObjectAttribute">Contains the attributes for this instance.</field>
    /// <field name="queries" type="Array" elementType="Query">Contains the queries for this instance.</field>

    po._sortedAttributes = [];
    po._isDirty = false;
    po._selectedNavigationTabElement = null;
    po._inputs = [];
    po._backupSecurityToken = null;

    po._initialize();

    return po;
}

PersistentObject.prototype.cancelEdit = function () {
    /// <summary>Cancels the current object and set it back in read mode. Does nothing when the Persistent Object is not in edit mode. </summary>

    if (this.inEdit) {
        this.securityToken = this._backupSecurityToken;
        this.attributes.run(function (attr) { attr.restoreEditBackup(); });
        this.showNotification();

        var stayInEdit = this.stateBehavior == "StayInEdit" || this.stateBehavior.contains("StayInEdit");
        this.editMode(stayInEdit);
        if (stayInEdit) {
            this._updateAttributes(this.attributes);
            this.isDirty(false);
        }
    }
};

PersistentObject.prototype.editMode = function (val) {
    /// <summary>Changes the edit mode of the Persistent Object.</summary>
    /// <param name="val" type="Boolean">The new value for the edit mode.</param>

    if (this.inEdit != val) {
        this.inEdit = val;

        var edit = this.actions["Edit"];
        var cancelEdit = this.actions["CancelEdit"];
        var endEdit = this.actions["EndEdit"];

        if (this.inEdit) {
            this._backupSecurityToken = this.securityToken;
            this.attributes.run(function (attr) { attr.backupBeforeEdit(); });

            if (cancelEdit != null)
                cancelEdit.canExecute(true);
            if (edit != null)
                edit.isVisible(false);
            if (endEdit != null)
                endEdit.isVisible(true);
        }
        else {
            this.isDirty(false);

            if (cancelEdit != null)
                cancelEdit.canExecute(false);
            if (edit != null)
                edit.isVisible(true);
            if (endEdit != null)
                endEdit.isVisible(false);

            if (this.target != null) {
                this.target.find("select").editableSelectInstances().run(function(es) {
                    if (es != null && typeof(es.hideList) == "function")
                        es.hideList();
                });
            }
        }

        this._updateAttributes(this.attributes);
    }
};

PersistentObject.prototype.getAttribute = function (name) {
    /// <summary>Gets the attribute with the specified name.</summary>
    /// <param name="name" type="String">The name of the attribute.</param>
    /// <returns type="PersistentObjectAttribute">Returns the attribute with the specified name, or null when none is found.</returns>

    return this.attributes.firstOrDefault(function (a) { return a.name == name; });
};

PersistentObject.prototype.getAttributeValue = function (name) {
    /// <summary>Gets the value of the attribute with the specified name.</summary>
    /// <param name="name" type="String">The name of the attribute.</param>
    /// <returns>Returns the value of the attribute with the specified name, or null when none is found.</returns>

    var attr = this.getAttribute(name);
    return attr != null ? attr.value : null;
};

PersistentObject.prototype.getDynamicColumCount = function (attributesTarget) {
    /// <summary>Calculates the count of columns based on the current width of the browser window.</summary>

    if ($.browser.mobile)
        return 1;
    
    var selectedItem = this.tabs != null ? this.tabs.selectedItem() : null;
    if (selectedItem != null && selectedItem.columnCount != null && selectedItem.columnCount != 0)
        return selectedItem.columnCount;

    var width = attributesTarget.width();
    if (!this.isMasterDetail()) {
        if (width > 1800)
            return Math.min(4, this.maxAttributesPerGroup);
        else if (width > 1350)
            return Math.min(3, this.maxAttributesPerGroup);
        else if (width > 800)
            return Math.min(2, this.maxAttributesPerGroup);
        else
            return Math.min(1, this.maxAttributesPerGroup);
    } else {
        if (width > 1800)
            return Math.min(4, this.maxAttributesPerGroup);
        else if (width > 1000)
            return Math.min(3, this.maxAttributesPerGroup);
        else if (width > 500)
            return Math.min(2, this.maxAttributesPerGroup);
        else
            return Math.min(1, this.maxAttributesPerGroup);
    }
};

PersistentObject.prototype.getQuery = function (name) {
    /// <summary>Gets the query with the specified name.</summary>
    /// <param name="name" type="String">The name of the query.</param>
    /// <returns type="Query">Returns the Query with the specified name, or null when none is found.</returns>

    return this.queries.firstOrDefault(function (q) { return q.name == name; });
};

PersistentObject.prototype.isDirty = function (val) {
    /// <summary>Gets or sets the is dirty flag.  A dirty Persistent Object is an object that has unsaved changes.</summary>
    /// <param name="val" type="Boolean">The optional new value to use; otherwise the current value will be returned.</param>
    /// <returns>Returns the value of the isDirty flag or this instance when set value is changed.</returns>

    if (typeof (val) == "undefined")
        return this._isDirty;

    if (this._isDirty != val) {
        this._isDirty = val;

        var endEditAction = this.actions["EndEdit"];
        if (endEditAction != null)
            endEditAction.canExecute(val);
    }

    return this;
};

PersistentObject.prototype.refreshFromResult = function (result) {
    /// <summary>Refreshes the Persistent Object with the data from the result. This method can be used to update an existing persistent object with updated values from the service. This should only be used when you handle the service calls yourself.</summary>
    /// <param name="result" type="PersistentObject">The result from the service containing the new information.</param>

    if (result != null && result.attributes != null && result.attributes.length > 0) {
        var changedAttrs = [];
        var requiresRerender = false;

        var syncAttrValue = function (existingAttr, resultAttr, name, changesRender) {
            if (existingAttr[name] != resultAttr[name]) {
                existingAttr[name] = resultAttr[name];
                changedAttrs.push(existingAttr);
                if (changesRender)
                    requiresRerender = true;
            }
        };

        var isInBulkEditMode = this.isInBulkEditMode();
        this.attributes.run(function (attr) {
            var serviceAttribute = result.attributes.firstOrDefault(function (a) { return a.id == attr.id; });
            if (serviceAttribute != null) {
                syncAttrValue(attr, serviceAttribute, "options");
                syncAttrValue(attr, serviceAttribute, "isRequired");
                syncAttrValue(attr, serviceAttribute, "isReadOnly");
                syncAttrValue(attr, serviceAttribute, "visibility", true);
                syncAttrValue(attr, serviceAttribute, "objectId");
                syncAttrValue(attr, serviceAttribute, "validationError");
                syncAttrValue(attr, serviceAttribute, "rules");

                if ((!attr.isReadOnly && attr._refreshValue !== undefined ? attr._refreshValue : attr.value) != serviceAttribute.value) {
                    attr.value = serviceAttribute.value;
                    changedAttrs.push(attr);
                }
                attr._refreshValue = undefined;

                attr.triggersRefresh = serviceAttribute.triggersRefresh;
                attr.isValueChanged = serviceAttribute.isValueChanged;

                if (attr.bulkEditCheckbox != null && isInBulkEditMode)
                    attr.bulkEditCheckbox.attr('checked', attr.isValueChanged);
            }
        });
        this._sortedAttributes = this.attributes.where(function (item) { return item.isVisible(); });

        if (this.isNew) {
            this.objectId = result.objectId;
            this.isNew = result.isNew;
        }
        this.securityToken = result.securityToken;

        if (result.breadcrumb != null && this.breadcrumb != result.breadcrumb) {
            this.breadcrumb = result.breadcrumb;

            if (this.target != null)
                this.target.find(".resultTitle").text(this.breadcrumb);
        }

        this.showNotification(result.notification, result.notificationType);
        this.isDirty(this.attributes.where(function (attr) { return attr.isValueChanged; }).length > 0);

        if (result.queriesToRefresh != null && this.queries != null) {
            var self = this;
            result.queriesToRefresh.run(function (id) {
                var query = self.queries.firstOrDefault(function (q) { return q.id == id; }) || self.queries.firstOrDefault(function (q) { return q.name == id; });
                if (query != null && query.hasSearched)
                    query.search();
            });
        }

        if (changedAttrs.length > 0) {
            var targetFocus = this._updateAttributes(changedAttrs.distinct(), requiresRerender);
            if (targetFocus != null)
                targetFocus.focus();
        }
    }
};

PersistentObject.prototype.hasVisibleActions = function () {
    /// <summary>Gets a value indicating that the Persistent Object has any visibile actions.</summary>
    /// <returns type="Boolean" />

    var actionCount = !this.isHidden && this.actions.where(function (a) { return a.name != "Filter" && a.name != "RefreshQuery"; }).length > 0;
    if (actionCount > 0)
        return true;

    if (this.isHidden && this.queries != null) {
        this.queries.run(function (q) {
            actionCount += q.actions.where(function (a) { return a.name != "Filter" && a.name != "RefreshQuery"; }).length;
        });
    }

    return actionCount > 0;
};

PersistentObject.prototype.isInBulkEditMode = function () {
    /// <summary>Gets a value indicating that the Persistent Object is currently in bulk edit mode.</summary>
    /// <returns type="Boolean" />

    return this.bulkObjectIds != null && this.bulkObjectIds.length > 0;
};

PersistentObject.prototype.isMasterDetail = function () {
    /// <summary>Gets a value indicating that the Persistent Object is being shown is master-detail mode.</summary>
    /// <returns type="Boolean" />

    return !$.browser.mobile && this.queryLayoutMode == "MasterDetail" && this.queries != null && this.queries.length > 0;
};

PersistentObject.prototype.open = function (target) {
    /// <summary>Shows the Persistent Object on the target element. The open method will clear all existing content from the target.</summary>
    /// <param name="target" type="jQuery">The jQuery object to render the persistent object on.</param>

    this.target = target;
    if (this.target == null && !app.isCore)
        this.target = $("#content");

    //reset page content
    if (this.isNew || (this.stateBehavior != null && (this.stateBehavior == "OpenInEdit" || this.stateBehavior.contains("OpenInEdit") || this.stateBehavior == "StayInEdit" || this.stateBehavior.contains("StayInEdit")))) {
        this.editMode(true);
    }

    if (app.isCore)
        return; // NOTE: No rendering on core

    this.target.html($($.browser.mobile ? "#persistentObject_mobile_template" : !this.isMasterDetail() ? "#persistentObject_template" : "#persistentObject_masterDetailTemplate").html());
    this.target.dataContext(this);

    this.target.actionBarExpander();

    var objTitle = this.target.find(".resultTitle");
    objTitle.text(this.breadcrumb);

    var self = this;
    if (!$.browser.mobile) {
        var persistenObjectNavigationAttributes = this.target.find(".persistentObjectNavigation.persistentObjectAttributes");
        var persistenObjectNavigationQueries = this.target.find(".persistentObjectNavigation.persistentObjectQueries");

        if (!this.isMasterDetail())
            this.target.find(".persistentObjectNavigationContainer").autoSizePanel([persistenObjectNavigationAttributes, persistenObjectNavigationQueries], 1);

        if (this.tabs.length == 1 && this.queries.length == 0) {
            this.target.find(".resultPanel").addClass("noNavigation");
        }
        else {
            if (this.tabs.length > 0) {
                var persistentObjectNavigationTabs = $("<ul>").addClass("persistentObjectNavigationTabs");
                this._renderAttributeTabs(persistentObjectNavigationTabs);

                if (this.isMasterDetail()) {
                    var poOverflowOwner = $("<div>").addClass("persistentObjectNavigationTabsOwner");
                    persistenObjectNavigationAttributes.append(poOverflowOwner);
                    poOverflowOwner.append(persistentObjectNavigationTabs);
                    poOverflowOwner.overflow($("<li><span>...</span></li>"), "persistentObjectNavigationTabsOverflow");
                }
                else
                    persistenObjectNavigationAttributes.append(persistentObjectNavigationTabs.addClass("persistentObjectNavigationTabsOwner"));
            }
            else
                persistenObjectNavigationAttributes.hide();

            if (this.queries.length > 0) {
                var queryNavigationTabs = $("<ul>").addClass("persistentObjectNavigationTabs");
                this._renderQueryTabs(queryNavigationTabs);

                var overflowOwner = $("<div>").addClass("persistentObjectNavigationTabsOwner");
                overflowOwner.append(queryNavigationTabs);

                var existingChildren = persistenObjectNavigationQueries.children();
                if (existingChildren.length == 1) {
                    var panel = $("<div>");
                    persistenObjectNavigationQueries.append(panel);

                    panel.autoSizePanel([overflowOwner, existingChildren.first()], 0);
                    overflowOwner.overflow($("<li><span>...</span></li>"), "persistentObjectNavigationTabsOverflow");
                }
                else {
                    persistenObjectNavigationQueries.append(overflowOwner);
                    overflowOwner.overflow($("<li><span>...</span></li>"), "persistentObjectNavigationTabsOverflow");
                }
            }
            else {
                persistenObjectNavigationQueries.hide();
            }
        }

        if (this.isMasterDetail()) {
            var splitter = this.target.find(".splitter");
            if (splitter.length > 0) {
                var resultPanel = this.target.find(".resultPanel .resultContentContainer");
                if (resultPanel.length > 0) {
                    var contentPoAttributes = resultPanel.find(".resultContent.persistentObjectAttributes");
                    var contentQueries = resultPanel.find(".resultContent.persistentObjectQueries");
                    if (contentPoAttributes.length > 0 && contentQueries.length > 0) {
                        var masterDetailSettings = localStorage.getItem("MasterDetailSettings");
                        if (masterDetailSettings == null)
                            masterDetailSettings = {};
                        else
                            masterDetailSettings = JSON.parse(masterDetailSettings);

                        var leftPctg = masterDetailSettings[this.id];
                        if (leftPctg == null)
                            leftPctg = 100 / resultPanel.innerWidth() * contentPoAttributes.outerWidth();
                        else {
                            this.target.find(".persistentObjectAttributes").css("width", leftPctg + "%");
                            this.target.find(".persistentObjectQueries").css("width", 100 - leftPctg + "%");
                        }

                        splitter.css({ left: leftPctg + "%" });
                        var splitterWidth = splitter.width();

                        var applyPercentages = function (e) {
                            var pctg = 100 / resultPanel.innerWidth() * (e.offsetX - splitterWidth / 2);
                            pctg = Math.max(10, pctg);
                            pctg = Math.min(90, pctg);
                            self.target.find(".persistentObjectAttributes").css("width", pctg + "%");
                            self.target.find(".persistentObjectQueries").css("width", (100 - pctg) + "%");

                            return pctg;
                        };

                        splitter.bind("mousedown", function () {
                            var onselectstartBackup = document.documentElement;
                            document.documentElement.onselectstart = function () { return false; };

                            var width = splitter.css("width");
                            splitter.css({ left: "0px", right: "0px", width: "auto" });

                            $(document).one("mouseup", function (eUp) {
                                splitter.unbind("mousemove");
                                document.documentElement.onselectstart = onselectstartBackup;
                                eUp = $.fixFireFoxOffset(eUp);

                                var percentage = applyPercentages(eUp);
                                masterDetailSettings[self.id] = percentage;
                                localStorage.setItem("MasterDetailSettings", JSON.stringify(masterDetailSettings));

                                splitter.css({ left: percentage + "%", right: "auto", width: width });
                            });

                            var throttleMove = _.throttle(function (eMove) {
                                eMove = $.fixFireFoxOffset(eMove);
                                applyPercentages(eMove);
                            }, 25);
                            splitter.bind("mousemove", throttleMove);
                        });
                    }
                }
            }
        }
    }
    else {
        var selector = this.target.find("select.persistentObjectNavigation");

        selector.on("change", function () {
            var dataContext = $(this).find("option:selected").dataContext();
            if (dataContext.constructor == Query)
                self.queries.selectedItem(dataContext);
            else
                self.tabs.selectedItem(dataContext);
        });

        if ((this.queries != null && this.queries.length > 0) || this.tabs.length > 1) {
            // show attribute tabs
            if (this.tabs.length > 0) {
                this.tabs.run(function (tab) {
                    var option = $.createElement('option', tab).append(tab.label);
                    selector.append(option);
                });
            }

            // show queries
            if (this.queries != null && this.queries.length > 0) {
                var queryTarget = selector;
                if (this.tabs.length > 0) {
                    queryTarget = $.createElement("optGroup").attr("label", app.getTranslatedMessage("Related"));
                    selector.append(queryTarget);
                }

                this.queries.run(function (query) {
                    var option = $.createElement('option', query).append(query.label);
                    queryTarget.append(option);
                });
            }
        }
        else
            selector.hide(); // No queries and only 1 tab, so hide the tabs/query container
    }

    var selectedTab = this.tabs.selectedItem();
    var selectedQuery = this.queries.selectedItem();
    if (selectedTab == null && selectedQuery == null) {
        if (this.tabs.length > 0)
            this.tabs.selectFirst();

        if (this.isMasterDetail() || (this.tabs.length == 0 && this.queries.length > 0))
            this.queries.selectFirst();
    }
    else {
        if (selectedTab != null) {
            this._showAttributes(selectedTab);
            this._updateSelectedNavigationTab(selectedTab._persistentObjectSelectedNavigationTabElement);
        }

        if (this.isMasterDetail() || (selectedTab == null && selectedQuery != null)) {
            this._showQuery(selectedQuery);
            this._updateSelectedNavigationTab(selectedQuery._persistentObjectSelectedNavigationTabElement);
        }
    }

    if (!isNullOrWhiteSpace(this.notification))
        this.showNotification(this.notification, this.notificationType);
};

PersistentObject.prototype.registerInput = function (attribute, input) {
    this._inputs.push({ attribute: attribute, input: input });
};

PersistentObject.prototype.save = function (onCompleted, onError) {
    /// <summary>Saves the current Persistent Object.</summary>
    /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
    /// <param name="onError" type="Function">The optional function that should be called when the operation returned an error.</param>

    this.showNotification();
    var handler = app.onAction["Save"];
    var poHandler = app.onPersistentObject[this.type];
    var poHooks = poHandler != null && poHandler.onAction != null ? poHandler.onAction["Save"] : null;

    var self = this;
    var executeAction = function () {
        app.gateway.executeAction("PersistentObject.Save", self, null, null, null, function (result) {
            var refreshWindow = false;
            if (self.id == app.userSettingsId) {
                var languageAttr = self.getAttribute("Language");
                if (languageAttr != null && languageAttr.isValueChanged)
                    refreshWindow = true;
                else {
                    var cultureInfoAttr = self.getAttribute("CultureInfo");
                    refreshWindow = cultureInfoAttr != null && cultureInfoAttr.isValueChanged;
                }
            }
            self.refreshFromResult(result);

            if (isNullOrWhiteSpace(self.notification) || self.notificationType != "Error") {
                if (refreshWindow) {
                    app.pageObjects = {};
                    app.currentPage = null;
                    window.location.reload();
                    return;
                } else if (self.id == app.feedbackId) {
                    delete app.pageObjects[self.getPath()];
                    window.history.back();
                    return;
                }

                self.isDirty(false);
                self.editMode(self.stateBehavior == "StayInEdit" || self.stateBehavior.contains("StayInEdit"));

                if (self.ownerAttributeWithReference != null) {
                    if (self.ownerAttributeWithReference.objectId != self.objectId) {
                        self.ownerAttributeWithReference.parent.editMode(true);

                        var queryResultItem = { id: result.objectId };
                        queryResultItem.toServiceObject = function () { return { id: result.objectId }; };

                        var selectedItems = [];
                        selectedItems.push(queryResultItem);

                        self.ownerAttributeWithReference.changeReference(selectedItems, function () {
                            self.ownerAttributeWithReference.parent.open();
                        });
                    }
                }
                else if (self.ownerQuery != null)
                    self.ownerQuery.search();
            }

            self.showNotification(self.notification, self.notificationType);

            var hookCompleted = handler != null ? handler.completed : null;
            var poCompleted = poHooks != null ? poHooks.completed : null;
            if (poCompleted != null) {
                if (hookCompleted != null) {
                    var genericCompleted = hookCompleted;
                    hookCompleted = function (po, h, action) { poCompleted(this, function () { genericCompleted(po, h, action); }, action); };
                }
                else
                    hookCompleted = poCompleted;
            }

            if (hookCompleted != null)
                hookCompleted(self, onCompleted || function () { }, result);
            else if (onCompleted != null)
                onCompleted(self, result);
        }, function (error) {
            self.showNotification(error, "Error");

            var hookError = handler != null ? handler.error : null;
            var poError = poHooks != null ? poHooks.error : null;
            if (poError != null) {
                if (hookError != null) {
                    var genericError = hookError;
                    hookError = function (e, h) { poError(e, function () { genericError(e, h, action); }, action); };
                }
                else
                    hookError = poError;
            }

            if (hookError != null)
                hookError(error, onError || function () { }, result);
            else if (onError != null)
                onError(error, result);
        });
    };

    var hookExecute = handler != null ? handler.execute : null;
    var poExecute = poHooks != null ? poHooks.execute : null;
    if (poExecute != null) {
        if (hookExecute != null) {
            var genericExecute = hookExecute;
            hookExecute = function (action, h) { poExecute(action, function () { genericExecute(action, h); }); };
        }
        else
            hookExecute = poExecute;
    }

    if (hookExecute != null)
        hookExecute(this.actions["Save"] || this.actions["EndEdit"], executeAction);
    else
        executeAction();
};

PersistentObject.prototype.setAttributeValue = function (name, value) {
    /// <summary>Sets the value of the attribute with specified name.</summary>
    /// <param name="name" type="String">The name of the attribute.</param>

    var attr = this.getAttribute(name);
    if (attr != null)
        attr.setValue(value);
};

PersistentObject.prototype.showNotification = function (notification, type) {
    /// <summary>Shows or hides the notification for this Persistent Object.</summary>
    /// <param name="notification" type="String">The notification message.</param>
    /// <param name="type" type="String" optional="true">The type of the notification.</param>

    this.notification = notification;
    this.notificationType = type;

    if (this.target != null) {
        var attributesPanel = this.target.find(".resultContent" + (this.isMasterDetail() ? ".persistentObjectAttributes" : ""));
        var notificationTarget = attributesPanel.find(".notificationTarget");
        if (notificationTarget.length > 0) {
            notificationTarget.showNotification(notification, type);

            if (!isNullOrWhiteSpace(notification))
                attributesPanel.scrollTop(0);
        }
    }
};

PersistentObject.prototype.toServiceObject = function () {
    /// <summary>Creates an optimized copy that can be sent to the service.</summary>
    /// <returns type="PersistentObject">Returns the copy of the PersistentObject that is optimized to be sent to the service.</returns>

    var result = copyProperties(this, ["id", "type", "objectId", "isNew", "isHidden", "bulkObjectIds", "securityToken"]);

    if (this.parent != null)
        result.parent = this.parent.toServiceObject();
    if (this.attributes != null)
        result.attributes = this.attributes.select(function (attr) { return attr.toServiceObject(); });

    return result;
};

PersistentObject.prototype._renderAttributeTabs = function (target) {
    var self = this;
    this.tabs.run(function (tab) {
        var span = $.createElement('span').append(tab.label);
        span.click(function () {
            if (self.tabs.selectedItem() == tab)
                return;

            if (self.isMasterDetail())
                target.find(".persistentObjectSelectedNavigationTab").removeClass("persistentObjectSelectedNavigationTab");
            else
                self.target.find(".persistentObjectSelectedNavigationTab").removeClass("persistentObjectSelectedNavigationTab");

            self.tabs.selectedItem(tab);
        });

        var li = $.createElement('li').addClass("persistentObjectNavigationTab").append(span);
        tab._persistentObjectSelectedNavigationTabElement = li;
        target.append(li);
    });
};

PersistentObject.prototype._renderQueryTabs = function (target) {
    var self = this;
    this.queries.run(function (query) {
        var span = $.createElement('span').append(query.label);
        span.click(function () {
            if (self.queries.selectedItem() == query)
                return;

            if (self.isMasterDetail())
                target.find(".persistentObjectSelectedNavigationTab").removeClass("persistentObjectSelectedNavigationTab");
            else
                self.target.find(".persistentObjectSelectedNavigationTab").removeClass("persistentObjectSelectedNavigationTab");

            query.focusSearch = true;
            self.queries.selectedItem(query);
        });

        var li = $.createElement('li').addClass("persistentObjectNavigationTab").append(span);
        target.append(li);
        query._persistentObjectSelectedNavigationTabElement = li;
    });
};

PersistentObject.prototype._initialize = function () {
    var self = this;
    this.actions = Actions.getActions(this.actionNames, this);

    if (this.attributes == null)
        this.attributes = [];
    else
        this.attributes = this.attributes.select(function (attr) { return new PersistentObjectAttribute(attr, self); }).sort(function (item1, item2) { return item1.offset - item2.offset; });

    this._sortedAttributes = this.attributes.where(function (item) { return item.isVisible(); });

    if (this.parent != null)
        this.parent = new PersistentObject(this.parent);

    if (this.queries != null) {
        this.queries = this.queries.select(function (q) { return new Query(q, self); }).sort(function (q1, q2) { return q1.offset - q2.offset; }).toSelector();
        this.queries.onSelectedItemChanged(function (query) {
            if (query != null) {
                self._showQuery(query);

                if (!self.isMasterDetail())
                    self.tabs.selectedItem(null);

                self._updateSelectedNavigationTab(query._persistentObjectSelectedNavigationTabElement);
            }
        });
    }
    else
        this.queries = [].toSelector();

    if (!this.isHidden) {
        if (this._sortedAttributes.length > 0) {
            this.tabs = this._sortedAttributes.distinct(function (attr) { return attr.tab; }).select(function (tab) {
                var newTab = self.tabs[tab] || { columnCount: 0 };
                newTab.label = tab || self.label || self.type;
                newTab.key = tab;

                return newTab;
            }).toSelector();
        }
        else {
            var tabs = [];
            for (var tabName in this.tabs) {
                var t = this.tabs[tabName];
                if (t.columnCount == null)
                    t.columnCount = 0;
                if (t.label == null)
                    t.label = self.label || self.type;
                tabs.push(t);
            }
            this.tabs = tabs.toSelector();
        }
    }
    else
        this.tabs = [].toSelector();

    this.tabs.onSelectedItemChanged(function (tab) {
        if (tab != null) {
            self._showAttributes(tab);

            if (!self.isMasterDetail())
                self.queries.selectedItem(null);

            self._updateSelectedNavigationTab(tab._persistentObjectSelectedNavigationTabElement);
        }
    });
};

PersistentObject.prototype._showQuery = function (query) {
    if (app.isCore)
        return; // NOTE: No rendering on core

    var selectedTabContainer = this.target.find(".resultContentContainer .resultContent" + (this.isMasterDetail() ? ".persistentObjectQueries" : ""));
    selectedTabContainer.empty();

    selectedTabContainer.attr('class').split(/\s+/).where(function (c) { return c.startsWith("-vi-"); }).run(function (c) { selectedTabContainer.removeClass(c); });
    selectedTabContainer.addClass("-vi-" + query.persistentObject.type);

    this.target.find(".resultPanel").removeClass("searchActive pagingActive");

    if (!this.hasVisibleActions())
        this.target.find(".resultPanel").addClass("noPersistentObjectActions");

    query.open(selectedTabContainer, this.target, this.target.find(".resultActionsContainer .resultActions" + (this.isMasterDetail() ? ".persistentObjectQueries" : "")));
};

PersistentObject.prototype._updateAttributes = function (attrs, requiresRerender) {
    if (app.isCore)
        return null; // NOTE: No rendering on core

    if (this.target == null)
        return null;

    var targetFocus = null;

    var container = this.target.find(".resultContentContainer .resultContent" + (this.isMasterDetail() ? ".persistentObjectAttributes" : ""));
    if (container.dataContext() == this) {
        var tab = this.tabs.selectedItem();
        if (!isNullOrEmpty(tab.newTemplateKey) && this.isNew == true) {
            container.empty();
            this._showTabWithTemplate(tab.newTemplateKey, container);
            this._attributeRender(container);
        }
        else if (!isNullOrEmpty(tab.templateKey)) {
            container.empty();
            this._showTabWithTemplate(tab.templateKey, container);
            this._attributeRender(container);
        }
        else if (requiresRerender) {
            this._showAttributes();
        }
        else {
            attrs.run(function (attr) {
                container.find("div[data-vidyano-attribute=\"" + attr.name + "\"]").each(function () {
                    var $this = $(this);
                    var lastFocusedElement = $this.find("*:focus");

                    attr.updateControlElement($this, true);

                    if (lastFocusedElement.length > 0) {
                        var candidates = $this.find(lastFocusedElement[0].tagName);
                        if (candidates.length > 0)
                            targetFocus = candidates.firstOrDefault(function (c) { return c.tabIndex == lastFocusedElement[0].tabIndex; }) || candidates[0];
                    }
                });

                container.find("label[data-vidyano-attribute=\"" + attr.name + "\"]").each(function () {
                    attr.updateLabelElement($(this), true);
                });
            });
        }

        this._postPersistentObjectRender(container);
    }

    return targetFocus;
};

PersistentObject.prototype._showAttributes = function () {
    if (app.isCore)
        return; // NOTE: No rendering on core

    if (this.target == null || this.target.length == 0 || this.target.dataContext() != this)
        return;

    this.target.find(".resultContentContainer .resultContent" + (this.isMasterDetail() ? ".persistentObjectAttributes" : "")).dataContext(this);

    if (!this.isMasterDetail())
        this.target.find(".resultPanel").removeClass("searchActive");

    if (this.hasVisibleActions()) {
        Actions.showActions(this.actions, this.target.find(".resultActionsContainer .resultActions" + (this.isMasterDetail() ? ".persistentObjectAttributes" : "")));
        this.target.find(".resultPanel").removeClass("noPersistentObjectActions");
    } else
        this.target.find(".resultPanel").addClass("noPersistentObjectActions");

    var selectedTabContainer = this.target.find(".resultContentContainer .resultContent" + (this.isMasterDetail() ? ".persistentObjectAttributes" : ""));
    selectedTabContainer.empty();

    selectedTabContainer.attr('class').split(/\s+/).where(function (c) { return c.startsWith("-vi-"); }).run(function (c) { selectedTabContainer.removeClass(c); });
    selectedTabContainer.addClass("-vi-" + this.type);

    selectedTabContainer.append($("<div class='notificationTarget'></div>"));

    var self = this;
    selectedTabContainer.unbind("resize");
    selectedTabContainer.bind("resize", function () {
        var selectedItem = self.tabs.selectedItem();
        if (selectedItem != null && (selectedItem.newTemplateKey == null || !self.isNew) && (selectedItem.templateKey == null || self.isNew) && self.columnCount != self.getDynamicColumCount($(this)))
            self._showAttributes();
    });

    var tab = this.tabs.selectedItem();
    if (typeof (tab.newTemplateKey) != "undefined" && this.isNew == true) {
        this._showTabWithTemplate(tab.newTemplateKey, selectedTabContainer);
    } else if (typeof (tab.templateKey) != "undefined") {
        this._showTabWithTemplate(tab.templateKey, selectedTabContainer);
    } else {
        var columnCount = $.browser.mobile ? 1 : parseInt(tab.columnCount, 10);
        var groups = this._sortedAttributes.where(function (attr) { return attr.tab == tab.key; }).distinct(function (attr) { return attr.group; });

        if (isNaN(columnCount) || columnCount == 0) {
            this.maxAttributesPerGroup = 0;

            for (var groupIdx = 0; groupIdx < groups.length; groupIdx++) {
                var groupAttributes = this._sortedAttributes.where(function (attr) { return attr.group == groups[groupIdx] && attr.tab == tab.key; });
                this.maxAttributesPerGroup = Math.max(this.maxAttributesPerGroup, groupAttributes.length);
            }

            columnCount = this.getDynamicColumCount(selectedTabContainer);
        }
        this.columnCount = columnCount;

        for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            var group = groups[groupIndex];

            var section = $.createElement('div').addClass('persistenObjectAttributeSection');
            var header = $.createElement('div').addClass('persistenObjectAttributeSectionHeader').append($.createElement('h2').append((group == "" ? app.getTranslatedMessage("DefaultAttributesGroup") : group)));
            var sectionContentDiv = $.createElement('div').addClass("persistenObjectAttributeSectionContent");
            section.append(header, sectionContentDiv);
            selectedTabContainer.append(section);

            var colIndex = 0;
            var increasedRowIndex = true;
            var attributesForGroup = this._sortedAttributes.where(function (attr) {
                return attr.group == group && attr.tab == tab.key;
            });

            for (var i = 0; i < attributesForGroup.length; i++) {
                var attribute = attributesForGroup[i];

                if (attribute.column != null) {
                    var attributeColumnIndex = Math.min(attribute.column, columnCount - 1);
                    //add spacer column to the fill the row to 100% width
                    if (colIndex > attributeColumnIndex && !increasedRowIndex) {
                        increasedRowIndex = true;
                        var spacerDivColumns = columnCount - colIndex;
                        if (spacerDivColumns > 0) {
                            var spacerElement = $.createElement('div').addClass('persistenObjectAttributeSectionColumn').css("width", (1 / columnCount) * spacerDivColumns * 100 + '%').append("&nbsp;");
                            sectionContentDiv.append(spacerElement);
                            colIndex++;
                            if (colIndex >= columnCount) {
                                colIndex = 0;
                                increasedRowIndex = true;
                            }
                        }
                    }
                    //add spacer column to the fill the row to the needed columnIndex
                    if (colIndex != attributeColumnIndex) {
                        var colDif = attributeColumnIndex - colIndex;
                        if (colDif > 0) {
                            sectionContentDiv.append($.createElement('div').addClass('persistenObjectAttributeSectionColumn').css("width", (1 / columnCount) * colDif * 100 + '%').append("&nbsp;"));
                            colIndex = attributeColumnIndex;
                        }
                    }
                }

                var colSpan = Math.min(columnCount, (attribute.columnSpan == null) ? 1 : Math.max(attribute.columnSpan, 1));
                if (colSpan > 1) {
                    if (colIndex + columnCount > columnCount && !increasedRowIndex) {
                        increasedRowIndex = true;

                        if (attribute.column == null)
                            colIndex = 0;
                    }
                }

                if (increasedRowIndex)
                    increasedRowIndex = false;

                var colspanOverride = Math.min(colSpan, columnCount - colIndex);
                var attrElement = attribute.createElement(colspanOverride, columnCount);
                sectionContentDiv.append(attrElement);

                colIndex += colSpan;
                if (colIndex >= columnCount) {
                    colIndex = 0;
                    increasedRowIndex = true;
                }
            }
        }
    }

    this._attributeRender(this.target);
    this._postPersistentObjectRender(this.target);
};

PersistentObject.prototype._attributeRender = function (container) {
    this.attributes.run(function (attr) {
        container.find("div[data-vidyano-attribute=\"" + attr.name + "\"]").each(function () {
            attr.updateControlElement($(this));
        });

        container.find("label[data-vidyano-attribute=\"" + attr.name + "\"]").each(function () {
            attr.updateLabelElement($(this));
        });
    });

    this._postAttributeRender(container);
};

PersistentObject.prototype._postAttributeRender = function (container) {
    if (app.isCore)
        return; // NOTE: No rendering on core

    if (this.inEdit) {
        container.find('.persistentObjectAttribute_Edit_ComboBox').vidyanoEditableSelect();
        container.find('.persistentObjectAttribute_Edit_DropDown').vidyanoSelect();
        container.find('.persistentObjectAttribute_Edit_Date').vidyanoDateEdit();
        container.find('.persistentObjectAttribute_Edit_Time').vidyanoTimeEdit();
        container.find('.persistentObjectAttribute_Edit_DateTime').vidyanoDateTimeEdit();
        container.find('.persistentObjectAttribute_Edit_DateTimeOffset').vidyanoDateTimeOffset();
        container.find('.persistentObjectAttribute_Edit_YesNo').vidyanoTriState();
        container.find('.persistentObjectAttribute_Edit_String').vidyanoString();
        container.find('.persistentObjectAttribute_Edit_UserRightResource').vidyanoString();
        container.find('.persistentObjectAttribute_Edit_Numeric').vidyanoNumeric();
        container.find('.persistentObjectAttribute_Edit_TranslatedString').vidyanoTranslatedString();
        container.find('.persistentObjectAttribute_Edit_FlagsEnum').vidyanoFlagsEnum();
        container.find('.persistentObjectAttribute_Edit_Reference').vidyanoReference();
        container.find('.persistentObjectAttribute_Edit_Image').vidyanoEditImage();
        container.find('.persistentObjectAttribute_Edit_BinaryFile').vidyanoEditBinaryFile();
        container.find('.persistentObjectAttribute_Edit_MultiLineString').vidyanoMultiLineString(true);
    } else {
        container.find('.persistentObjectAttribute_MultiLineString').vidyanoMultiLineString();
    }

    app.postPersistentObjectAttributeRender(container, this);
};

PersistentObject.prototype._postPersistentObjectRender = function (container) {
    if (app.isCore)
        return; // NOTE: No rendering on core

    container.find('.persistentObject_Edit_Template').vidyanoEditTemplate();

    if (this.inEdit) {
        var elementToFocus = container.find(":focusable").filter(':first');
        if (elementToFocus.length > 0) {
            var element = elementToFocus.get(0);
            if (element.type == 'text' || element.tagName == 'TEXTAREA') {
                element.selectionStart = elementToFocus.val().length;
            }

            element.focus();
        }
    }

    container.find('#weekScheduledPlaceHolder').weekScheduler();
    container.find('#browseCertificate').vidyanoBrowseCertificate();

    var code = app.code[this.id];
    if (code != null) {
        var postRenderCode = code["postRender"];
        if (postRenderCode != null)
            postRenderCode(container, this);
    }

    app.postPersistentObjectRender(container, this);

    var self = this;
    container.find("div[data-vidyano-action]").each(function () {
        var $this = $(this);
        $this.off("click");
        $this.on("click", function () { self.actions[$this.attr("data-vidyano-action")].execute(); });
    });
};

PersistentObject.prototype._showTabWithTemplate = function (templateKey, container) {
    var template = null;
    if (app.templates[templateKey] != null)
        template = app.templates[templateKey].data;

    if (typeof (template) == "function")
        container.append(template(this));
    else
        container.append("<span class='persistenObjectTemplateNotFound'>Template for persistent object " + this.type + " is empty.</span>");
};

PersistentObject.prototype._updateSelectedNavigationTab = function (newItem) {
    if (newItem != null)
        newItem.addClass("persistentObjectSelectedNavigationTab");

    this._selectedNavigationTabElement = newItem;

    app.trackPageView();
};