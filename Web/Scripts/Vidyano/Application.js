/// <reference path="Scripts/jquery-1.8.1-min.js" />
/// <reference path="Scripts/signals.js" />
/// <reference path="Scripts/crossroads.js" />
/// <reference path="Scripts/hasher.js" />
/// <reference path="Scripts/shortcut.js" />
/// <reference path="Scripts/underscore.js" />
/// <reference path="Scripts/CodeMirror/codemirror.js" />

/// <reference path="Common.js" />
/// <reference path="PersistentObject.js" />
/// <reference path="ProgramUnit.js" />
/// <reference path="ProgramUnitItem.js" />
/// <reference path="Query.js" />
/// <reference path="QueryColumn.js" />
/// <reference path="QueryResultItem.js" />
/// <reference path="QueryResultItemValue.js" />
/// <reference path="Resource.js" />
/// <reference path="ActionBase.js" />
/// <reference path="ServiceGateway.js" />
/// <reference path="Pages.js" />

var Vidyano = (function (window, $) {
    var hasher = window.hasher, crossroads = window.crossroads, _ = window._, shortcut = window.shortcut, codeMirror = window.CoreMirror;

    // The app variable provides global access to the current running Vidyano application.
    var app = new Application();

    if (!app.isCore) {
        // The hasher or crossroads libraries will be used when available to provide a complete HTML5 client for the end-user.
        hasher.prependHash = "!/";

        $(function () {
            crossroads.addRoute("", function () { app.ensureInitialized(showHomePage, arguments); });
            crossroads.addRoute("SignIn", function () {
                if (!app.clientData.isInitialized) {
                    var tm = new TaskManager();
                    tm.startTask(function (t) {
                        app.gateway.getClientData(function (clientData) {
                            clientData.isInitialized = true;
                            app.clientData = clientData;

                            tm.markDone(t);
                        }, function (e) {
                            if (!isNullOrEmpty(e.responseText)) {
                                try {
                                    var response = JSON.parse(e.responseText);
                                    app.lastError = response["ExceptionMessage"] || response["Message"] || response.notification;
                                } catch (e) {
                                    app.lastError = e.message || e;
                                }
                            }
                            else
                                app.lastError = e.statusText;

                            tm.markDone(t);
                        });
                    });

                    tm.waitForAll(signInPage);
                }
                else
                    signInPage();
            });
            crossroads.addRoute("SignInWithToken/{user}/{token}", function (user, token) {
                token = token.replace('_', '/');
                app.userName = $.base64.decode(user.replace('_', '/'));

                app.setAuthToken(token);
                $.cookie("userName", app.userName);
                $.cookie("staySignedIn", null);

                var returnUrl = app.returnUrl();
                app.returnUrl(null);
                hasher.setHash(returnUrl != null ? returnUrl : "");
            });

            crossroads.addRoute("{puName}/Query.{name}/:filterName:", function (puName, name, filterName) {
                app._programUnitName = puName;
                app.ensureInitialized(showQueryPage, [name, filterName]);
            });
            crossroads.addRoute("{puName}/PersistentObject.{name}/:objectId:", function (puName, name, objectId) {
                app._programUnitName = puName;
                app.ensureInitialized(showPersistentObject, [name, objectId]);
            });
            crossroads.addRoute("Query/0/{id}/:filterName:", function () { app.ensureInitialized(showQueryPage, arguments); });
            crossroads.addRoute("Query.{name}/:filterName:", function () { app.ensureInitialized(showQueryPage, arguments); });
            crossroads.addRoute("PersistentObject/0/{id}/:objectId:", function () { app.ensureInitialized(showPersistentObject, arguments); });
            crossroads.addRoute("PersistentObject.{name}/:objectId:", function () { app.ensureInitialized(showPersistentObject, arguments); });
            crossroads.addRoute("PersistentObjectFromAction/{rnd}", function () { app.ensureInitialized(showPersistentObjectFromAction, arguments); });
            crossroads.bypassed.add(function () {
                if (app.persistentObject == null) {
                    crossroads.resetState();
                    app.ensureInitialized();
                };
            });

            function parseHash(newHash) {
                crossroads.parse(newHash);
            }
            hasher.initialized.add(parseHash);
            hasher.changed.add(parseHash);
            hasher.changed.add(function () { app.trackPageView(); });
            hasher.init();
        });

        // Handle key handling
        var doAction = function (name, alternativeName) {
            if ($(".ui-dialog").length > 0)
                return true;

            var currentPage = app.currentPage;
            if (currentPage != null && currentPage.actions != null) {
                var action = currentPage.actions[name] || currentPage.actions[alternativeName];
                if (action == null && currentPage.isMasterDetail && currentPage.isMasterDetail() && currentPage.queries && currentPage.queries.selectedItem)
                    action = currentPage.queries.selectedItem().actions[name];

                if (action != null) {
                    if (action.canExecute()) {
                        action.execute("-1");
                        return false;
                    }
                }
            }

            return true;
        };

        shortcut.add("delete", function () {
            return doAction("Delete");
        });
        shortcut.add("ctrl+n", function () {
            return doAction("New");
        });
        shortcut.add("insert", function () {
            return doAction("New");
        });
        shortcut.add("ctrl+s", function () {
            doAction("Save", "EndEdit");
            return false;
        });
        shortcut.add("f1", function () {
            return doAction("ShowHelp");
        });
        shortcut.add("f2", function () {
            return doAction("BulkEdit", "Edit");
        });
        shortcut.add("f5", function () {
            return doAction("RefreshQuery");
        });
        shortcut.add("ctrl+r", function () {
            return doAction("RefreshQuery");
        });
        shortcut.add("esc", function () {
            return doAction("CancelEdit", "CancelSave");
        });
        shortcut.add("ctrl+a", function () {
            var currentPage = app.currentPage;
            if (currentPage instanceof Query)
                currentPage.selectToggle();

            return false;
        }, { 'disable_in_input': true })

        // CodeMirror handling
        if (codeMirror != null) {
            codeMirror.defaults.mode = "javascript";
        }
    }

    function Application() {
        /// <summary>Provides access to current Vidyano application.</summary>

        this.isCore = typeof (hasher) == "undefined" || typeof (crossroads) == "undefined";

        var lastPageView = null;
        var userSettingsObj = null;

        /// <field name="title" type="String">The title property is used a prefix when updating the document title.</field>
        this.title = document.title;
        this.userName = null;
        this.uniqueId = null;
        this.bootTime = new Date();
        /// <field name="session" type="PersistentObject">Provides access to the session that is always sent to the service and updated after each request, is null if no session is configured.</field>
        this.session = null;
        /// <field name="gateway" type="ServiceGateway">Provides access to the service gateway that can be used to invoke calls on the service.</field>
        this.gateway = new ServiceGateway("");
        this.pageObjects = {};
        /// <field name="onAction">The onAction property is used to override logic for actions (execute, completed, error).</field>
        this.onAction = {};
        /// <field name="onPersistentObject">The onPeristentObject property is used to override logic for persistent objects (receive, receiveQuery, onAction).</field>
        this.onPersistentObject = {};
        this.lastError = null;
        /// <field name="currentPage">The currentPage property provides access to the current open page (either a PersistentObject or a Query) and is useful during debugging.</field>
        this.currentPage = null;
        this.currentPath = null;
        /// <field name="isMobile" type="Boolean">This field indicates whether the current application is running on a mobile browser.</field>
        this.isMobile = $.mobile;
        /// <field name="isTablet" type="Boolean">This field indicates whether the current application is running on a tablet browser.</field>
        this.isTablet = /(iPad|Android|BlackBerry|ARM)/.test(navigator.userAgent || navigator.vendor || window.opera);
        /// <field name="settings">The settings property is used to override default Vidyano settings.</field>
        this.settings = {
            defaultSpinnerOptions: { lines: 8, length: 0, width: 5, radius: 8, color: '#0c5d7d', speed: 1, trail: 70, shadow: false, hwaccel: true },
            language: null
        };
        this.clientData = {
            languages: {},
            providers: {},
            defaultUser: null,
            isInitialized: false
        };
        this.userSettings = {};

        this.canProfile = false;
        this.isProfiling = false;
        this.userId = null;
        this.feedbackId = null;
        this.userSettingsId = null;
        this.globalSearchId = null;
        this.analyticsKey = null;
        this.customRoutes = {};

        this.persistentObject = null;
        this.programUnits = null;
        this.templates = null;
        this.icons = null;
        this.templateParser = typeof (_) != "undefined" ? _.template : null;
        this.code = {};
        this._messages = {};

        this.currentExceptionHandler = function () { };

        this._getUnsavedChanges = function (target) {
            var unsavedPos = [];
            for (var propName in app.pageObjects) {
                if (propName != target && this.pageObjects[propName].inEdit && this.pageObjects[propName]._isDirty)
                    unsavedPos.push(app.pageObjects[propName]);
            }
            return this.onCheckForUnsavedChanges(unsavedPos);
        };

        this.hasUnsavedChanges = function (target) {
            var unsavedPos = this._getUnsavedChanges(target);
            return unsavedPos != null && unsavedPos.length > 0;
        };

        this.removeUnsavedChanges = function (target) {
            var unsavedChanges = this._getUnsavedChanges(target);
            for (var i = 0; i < unsavedChanges.length; i++) {
                var po = unsavedChanges[i];
                if (po.isNew)
                    delete this.pageObjects[po.getPath()];
                else
                    po.cancelEdit();
            }
        };

        this.navigate = function (url, replace) {
            /// <summary>Navigates to the specified url.</summary>
            /// <param name="url" type="String">The url that should be navigated to.</param>
            /// <param name="replace" type="Boolean">Determines if the current history entry in the browser should be replaced, otherwise a new history entry will be added.</param>

            var onNavigate = function () {
                setTimeout(function () {
                    if (replace)
                        hasher.replaceHash(url);
                    else
                        hasher.setHash(url);

                    app.isNavigating = false;
                }, 0);
            };

            app.isNavigating = true;
            if (app.hasUnsavedChanges(url) && (app.pageObjects[url] == null || app.pageObjects[url].ownerAttributeWithReference == null)) {
                var d = $.createElement("div");
                d.html(app.getTranslatedMessage("ConfirmLeavePage"));

                var buttons = {};
                buttons[app.getTranslatedMessage("StayOnThisPage")] = function () {
                    $(this).dialog("close");
                    d.remove();
                    app.isNavigating = false;
                };

                buttons[app.getTranslatedMessage("LeaveThisPage")] = function () {
                    $(this).dialog("close");
                    d.remove();
                    app.removeUnsavedChanges();
                    onNavigate(url, replace);
                };

                d.dialog({
                    title: app.getTranslatedMessage("PagesWithUnsavedChanges"),
                    resizable: false,
                    open: function () { $(".ui-dialog-titlebar-close").hide(); },
                    modal: true,
                    width: 400,
                    buttons: buttons
                });
            } else
                onNavigate(url, replace);
        };

        this.dispose = function () {
            /// <summary>Cleans up the application instance.</summary>

            $(".programUnits").empty();
            $(".programUnitItems").empty();

            Actions.showActions(null);

            this.canProfile = false;
            this.isProfiling = false;
            this.userId = null;
            this.feedbackId = null;
            this.userSettingsId = null;
            this.lastError = null;
            this.persistentObject = null;
            this.programUnits = null;
            this.templates = null;
            this.icons = null;
            this.currentPage = null;
            this.currentPath = null;
            this.pageObjects = {};
            this.userSettings = {};
            this.code = {};
            this._messages = {};
            this.setAuthToken(null);
            this.session = null;
            document.title = this.title;

            lastPageView = null;
            userSettingsObj = null;

            for (var name in this.customRoutes)
                crossroads.removeRoute(this.customRoutes[name].crossroadsRoute);
            this.customRoutes = {};
        };

        this.staySignedIn = $.cookie("staySignedIn", { force: true }) == "true";

        this.setAuthToken = function (token) {
            /// <summary>Sets the authentication token for the current user.</summary>
            /// <param name="token" type="String">The token that should be used.</param>

            if (token != null) {
                this.authToken = token;
                if (!this.staySignedIn) {
                    $.cookie("authToken", token);
                } else {
                    var exp = new Date();
                    exp.setDate(exp.getDate() + 14);

                    $.cookie("authToken", token, { expires: exp });
                }
            }
            else {
                this.authToken = null;
                this.userName = null;
                $.cookie("authToken", null);
            }
        };

        this.getAuthToken = function () {
            /// <summary>Gets the authentication token for the current user.</summary>
            /// <returns type="String" />

            var token = this.authToken;
            if (isNullOrWhiteSpace(token))
                return $.cookie("authToken");

            return token;
        };

        this.returnUrl = function (value) {
            /// <summary>Gets or sets the return url that should be used after sign in.</summary>

            if (typeof (value) == "undefined")
                return app._returnUrl || $.cookie("returnUrl");

            app._returnUrl = value;
            return $.cookie("returnUrl", value);
        };

        this.isTrial = function (trial) {
            /// <summary>Sets the is trial mode, this is used to help developers with warning them that a license is required.</summary>
            /// <param name="trial" type="Boolean">A value indicating if the application is in trial or not.</param>

            if (trial) {
                var trialMessage = $("<span>").text(app.getTranslatedMessage("InTrial"));
                var trialNotification = $("<div class='trialNotification'>").append(trialMessage);
                if (this.hasManagement)
                    trialMessage.append("&nbsp;(<a href='#!/PersistentObject.842cbc87-e2e3-40f1-a3aa-1c869ad27414'>" + Actions.actionDefinitions["ActivateLicense"].displayName + "</a>)");
                var closeTrialNotiticationBox = $("<div class='trialNotificationCloseBox'>").text("x");

                trialNotification.append(closeTrialNotiticationBox);
                $("#rootContainer").append(trialNotification);

                closeTrialNotiticationBox.one("click", function () {
                    $(".trialNotification").remove();
                });
            }
            else
                $(".trialNotification").remove();
        };

        this.ensureInitialized = function (f, args) {
            /// <summary>Helper method used for routes that make sure that the application is initialized before navigating to a page.</summary>

            //close all open dialogs
            $(".ui-dialog").remove();
            $(".dialog-content").remove();
            $(".editable-select-options").remove();
            $("#persistentObjectAttributeToolTip").remove();

            var onCompleted = function (replace) {
                if (f != null)
                    f.apply(null, Array.prototype.slice.call(args));
                else {
                    if (replace)
                        app.navigate(app.returnUrl(), true);
                    else
                        crossroads.parse(app.returnUrl());
                }

                app.returnUrl(null);
            };
            var onError = function (e) {
                app.lastError = e;
                app.redirectToSignIn();
                app.currentExceptionHandler(e);
            };

            if (app.persistentObject == null) {
                if ($.mobile)
                    $("#rootContainer").addClass("mobile");

                app.returnUrl(hasher.getHash());

                var tm = new TaskManager();
                tm.startTask(function (t) {
                    app.gateway.getClientData(function (clientData) {
                        clientData.isInitialized = true;
                        app.clientData = clientData;

                        tm.markDone(t);
                    }, function (e) {
                        tm.markError(t, e);
                    });
                });

                tm.waitForAll(function () {
                    if ($.cookie("userName") != null && app.getAuthToken() != null)
                        app.gateway.getApplication($.cookie("userName"), null, onCompleted, onError);
                    else if (app.clientData.defaultUser != null) {
                        $.cookie("authToken", null);
                        app.staySignedIn = false;
                        $.cookie("staySignedIn", null);
                        $.cookie("userName", null);

                        app.gateway.getApplication(app.clientData.defaultUser, null, onCompleted, onError);
                    } else
                        app.navigate("SignIn");
                }, onError);
            }
            else
                onCompleted(true);
        };

        if (this.isCore) {
            this.signIn = function (userName, password, onCompleted, onError) {
                this.gateway.getApplication(userName, password, onCompleted, onError);
            };
        }

        this.oAuthSignIn = function (providerName) {
            document.location = this.clientData.providers[providerName].parameters["requestUri"];
        };

        this.signOut = function (usingDefaultUser) {
            /// <summary>Sign out the current user, if the application is using the default user it will go directly to the Sign in page.</summary>
            /// <param name="usingDefaultUser" type="Boolean" optional="true">A value indicating if the default user is currently used.</param>

            this.dispose();

            if (!this.isCore) {
                $("#rootContainer").dataContext(null).empty();
                if (this.clientData.providers && Object.keys(this.clientData.providers).length == 1 && this.clientData.providers["Acs"] && !isNullOrEmpty(this.clientData.providers["Acs"].parameters.signOutUri))
                    document.location = this.clientData.providers["Acs"].parameters.signOutUri;
                else
                    this.navigate(usingDefaultUser || this.clientData.defaultUser == null ? "SignIn" : "", true);
            }
        };

        this.isSignedIn = function () {
            /// <summary>Gets a value indicating that an user is currently signed in.</summary>
            /// <returns type="Boolean" />

            return !isNullOrWhiteSpace(this.getAuthToken());
        };

        this.isUsingDefaultUser = function () {
            /// <summary>Gets a value indicating that the default user is currently logged in.</summary>
            /// <returns type="Boolean" />

            return this.clientData.defaultUser != null && (this.userName == null || this.userName == this.clientData.defaultUser);
        };

        this.redirectToSignIn = function () {
            /// <summary>Redirects the user to the sign in page and remember the current url for after sign in.</summary>

            if (this.isCore)
                return false;

            var returnUrl = hasher.getHash();
            if (returnUrl == "SignIn") {
                window.location.reload();
                return true;
            }

            this.returnUrl(returnUrl);
            this.navigate("SignIn");
            return true;
        };

        this.showException = function (e) {
            /// <summary>Shows a global exception in the application.</summary>
            /// <param name="e" type="String">The exception that should be shown.</param>

            this.lastError = e;

            var content = $("#content");
            content.empty();
            var errorBox = $("<div>").css({ margin: "12px" });
            content.append(errorBox);

            errorBox.showNotification(e, "Error");

            if (window.console && window.console.log)
                window.console.log("Error: " + e);
        };

        this.setTitle = function (title) {
            /// <summary>Sets the browser's title.</summary>
            /// <param name="title" type="String" optional="true">An optional extra title that will be appended.</param>

            document.title = isNullOrEmpty(title) || title == this.title ? this.title : this.title + " - " + title;
        };

        this.getUrlForPersistentObject = function (po, objectId, programUnit) {
            /// <summary>Gets a value that represents an url for the specified Persistent Object, using custom routes if possible.</summary>
            /// <param name="po" type="PersistentObject">The Persistent Object that should be used to generate an url for.</param>
            /// <param name="objectId" type="String">The optional ObjectId that should be used to generate an url for, otherwise po.objectId will be tried.</param>
            /// <param name="programUnit" type="ProgramUnit">The optional program unit that this url should be opened in.</param>
            /// <returns type="String" />

            if (programUnit == null)
                programUnit = this.programUnits.selectedItem();

            var customRoute = this.customRoutes[po.id];
            var url = programUnit.name + "/" + (customRoute != null ? customRoute.name : ("PersistentObject." + po.id));
            if (objectId == null)
                objectId = po.objectId;
            if (!isNullOrEmpty(objectId))
                url += "/" + objectId;

            return url;
        };

        this.getUrlForQuery = function (query, filterName, programUnit) {
            /// <summary>Gets a value that represents an url for the specified Query, using custom routes if possible.</summary>
            /// <param name="query" type="Query">The Query that should be used to generate an url for.</param>
            /// <param name="filterName" type="String" optional="true">The optional filter name for the query.</param>
            /// <param name="programUnit" type="ProgramUnit">The optional program unit that this url should be opened in.</param>
            /// <returns type="String" />

            if (programUnit == null)
                programUnit = this.programUnits.selectedItem();

            var id = typeof (query) == "string" ? query : query.id;
            var customRoute = this.customRoutes[id];
            var url = programUnit.name + "/" + (customRoute != null ? customRoute.name : ("Query." + id));
            if (!isNullOrEmpty(filterName))
                url += "/" + escape(filterName);

            return url;
        };

        this.getUrlForProgramUnit = function (pu) {
            /// <summary>Gets a value that represents an url for the specified Program Unit, using custom routes if possible.</summary>
            /// <param name="pu" type="ProgramUnit">The Program Unit that should be used to generate an url for.</param>
            /// <returns type="String" />

            if (pu.openFirst && !pu.hasTemplate && pu.items.length > 0) {
                var item = pu.items[0];
                var filterName = undefined;
                if (item.subItems != null && item.subItems.length > 0)
                    item = item.subItems[0];
                if (item.filters != null && item.filters.length > 0)
                    filterName = item.filters[0];

                if (item.query != null)
                    return this.getUrlForQuery(item.query, filterName, pu);
                if (item.persistentObject != null)
                    return this.getUrlForPersistentObject(item.persistentObject, null, pu);
            }

            var id = typeof (pu) == "string" ? pu : pu.id;
            var customRoute = this.customRoutes[id];
            return (customRoute != null ? customRoute.name : ("ProgramUnit." + id));
        };

        this.updateMessages = function (messagesQuery) {
            // NOTE: Internal use only
            var self = this;
            messagesQuery.items.forEach(function (message) {
                self._messages[message.getValue("Key")] = message.getValue("Value");
            });
        };

        this.updateProgramUnits = function (programUnits) {
            // NOTE: Internal use only
            if (programUnits == null)
                return;

            var self = this;
            this.hasManagement = programUnits.hasManagement;
            this.programUnits = programUnits.units.map(function (item) { return new ProgramUnit(item, self.hasManagement); }).toSelector();

            this.programUnits.onSelectedItemChanged(function (pu) {
                self.programUnits.forEach(function (p) {
                    if (p.selector != null)
                        p.selector.removeClass("selectedProgramUnit");
                });

                if (pu != null) {
                    pu.open();
                    $(".activeProgramUnit").text(pu.title);
                    if (pu.selector != null)
                        pu.selector.addClass("selectedProgramUnit");
                }
            });
        };

        this.setDefaultProgramUnit = function (pu) {
            this.userSettings.defaultProgramUnit = pu != null ? pu.name : null;
            this.saveUserSettings();
        };

        this.getTranslatedMessage = function (key) {
            /// <summary>Gets the translated message for the specified key.</summary>
            /// <param name="key" type="String">The message key.</param>
            /// <returns type="String" />

            var translated = this._messages[key] || key;

            if (arguments.length > 1) {
                var args = Array.prototype.slice.call(arguments);
                args[0] = translated;
                translated = String.format.apply(null, args);
            }

            return translated;
        };

        this.updateResources = function (resourcesQuery) {
            /// <summary>Updates the resources (internal use only).</summary>

            var icons = {};
            var templates = {};

            var templateParser = this.templateParser;

            resourcesQuery.items.forEach(function (item) {
                var resource = new Resource(item);
                var type = item.getValue("Type");
                if (type == "Icon") {
                    icons[resource.key] = resource;
                } else if (type == "Template") {
                    if (templateParser != null && !isNullOrWhiteSpace(resource.data)) {
                        try {
                            resource.data = templateParser(resource.data);
                            templates[resource.key] = resource;
                        }
                        catch (e) {
                            if (window.console != null && window.console.log != null)
                                window.console.log("JavaScript: Failed parsing template " + resource.key + ": " + (e.message || e));
                        }
                    }
                }
            });

            this.icons = icons;
            this.templates = templates;
        };

        this.openPersistentObject = function (obj, fromAction, pu, replace) {
            /// <summary>Open the Persistent Object on a new page.</summary>
            /// <param name="obj" type="PersistentObject">The Persistent Object that should be opened.</param>
            /// <param name="fromAction" type="Boolean" optional="true">Specifies if the Persistent Object was opened from an Action.</param>
            /// <param name="pu" type="ProgramUnit" optional="true">Specifies what program unit should be used to open the Persistent Object in.</param>
            /// <param name="replace" type="Boolean">Specifies if the current browser page should be replaced or not.</param>

            if (this.isCore)
                return; // NOTE: Can't open pages

            if (pu == null)
                pu = this.programUnits.selectedItem();

            var path = fromAction ? "PersistentObjectFromAction/" + getRandom() : this.getUrlForPersistentObject(obj, null, pu);
            obj.getPath = function () { return path; };

            this.pageObjects[path] = obj;
            this.navigate(path, replace);
        };

        this.postPersistentObjectAttributeRender = function (container, obj) {
            /// <summary>Is called once after a Persistent Object is rendered or individually for attributes that are changed.</summary>
            /// <param name="container">The jQuery instance that contains the container that is being rendered on.</param>
            /// <param name="obj" type="PersistentObject">The Persistent Object that is being rendered.</param>
        };

        this.postPersistentObjectRender = function (container, obj) {
            /// <summary>Is called after a Persistent Object is rendered.</summary>
            /// <param name="container">The jQuery instance that contains the container that is being rendered on.</param>
            /// <param name="obj" type="PersistentObject">The Persistent Object that is being rendered.</param>
        };

        this.postQueryRender = function (container, query) {
            /// <summary>Is called after a Query is rendered.</summary>
            /// <param name="container">The jQuery instance that contains the container that is being rendered on.</param>
            /// <param name="query" type="Query">The Query that is being rendered.</param>
        };

        this.updateSession = function (obj) {
            // NOTE: Internal use only

            if (this.session == null || obj == null || this.session.id != obj.id)
                this.session = obj != null ? new PersistentObject(obj) : null;
            else
                this.session.refreshFromResult(new PersistentObject(obj));

            try {
                this.onSessionUpdated(this.session);
            }
            catch (e) {
                this.showException("JavaScript: " + (e.message || e));
            }
        };

        this.onInitialized = function () {
            /// <summary>Is called when the Application is initialized after the user has logged in.</summary>
        };

        this.onSessionUpdated = function (session) {
            /// <summary>Is called when the Session is updated.</summary>
            /// <param name="session" type="PersistentObject">The current session instance, or null if no session is configured.</param>
        };

        this.onCheckForUnsavedChanges = function (persistentObjects) {
            /// <summary>Is called when the application is checking for unsaved changes. By default, nothing is filtered, so all unsaved changes should be confirmed.</summary>
            /// <param name="persistentObjects" type="Array">Array with the persistent objects that contain unsaved changes</param>
            /// <returns type="Array">Array with the persistent objects that contain unsaved changes</returns>

            return persistentObjects;
        };

        this.invokeGlobalSearch = function (searchText) {
            /// <summary>Can be used to invoke the global search for the specified searchText.</summary>
            /// <param name="searchText" type="String">The search text that should be used for the global search.</param>

            if (this.globalSearchId == "00000000-0000-0000-0000-000000000000")
                return;

            var self = this;
            this.gateway.getPersistentObject(null, this.globalSearchId, searchText, function (result) {
                self.openPersistentObject(result);
            }, function (error) {
                self.showException(error);
            });
        };

        var selectProgramUnitItem = function (predicate) {
            if (app.programUnits == null)
                return;

            var findItem = function (pu) {
                return pu.items.firstOrDefault(function (item) {
                    if (item.subItems != null)
                        return item.subItems.firstOrDefault(predicate);

                    return predicate(item);
                });
            };

            app.resetSelectedProgramUnitItem();

            var programUnit = app.programUnits.selectedItem();

            var found = false;
            var programUnitItem;
            if (programUnit != null && programUnit.items.length > 0) {
                programUnitItem = findItem(programUnit);
                if (programUnitItem != null)
                    found = true;
            }

            if (!found) {
                app.programUnits.filter(function (pu) { return pu != programUnit; }).forEach(function (pu) {
                    if (!found) {
                        programUnitItem = findItem(pu);
                        if (programUnitItem != null) {
                            found = true;

                            programUnit = pu;
                        }
                    }
                });
            }

            if (app.programUnits.selectedItem() != programUnit) {
                app.returnUrl("DontShowTemplate");
                app.programUnits.selectedItem(programUnit);
                app.returnUrl(null);
            }

            if (found && programUnitItem.element != null)
                programUnitItem.element.addClass("programUnitItemSelected");
        };

        this.resetSelectedProgramUnitItem = function () {
            var programUnit = this.programUnits.selectedItem();
            if (programUnit != null) {
                programUnit.items.forEach(function (item) {
                    if (item.element != null)
                        item.element.removeClass("programUnitItemSelected");

                    if (item.subItems != null)
                        item.subItems.filter(function (subItem) { return subItem.element != null; }).forEach(function (subItem) { subItem.element.removeClass("programUnitItemSelected"); });
                });
            }
        };

        this.selectQueryProgramUnitItem = function (id) {
            /// <summary>Selects a Query menu item with the same id.</summary>
            /// <param name="id" type="String">The id of the Query.</param>

            selectProgramUnitItem(function (item) { return item.query != null && item.query.id == id; });
        };

        this.selectPersistentObjectProgramUnitItem = function (id, objectId) {
            /// <summary>Selects a Persistent Object ùenu item with the same id and objectId.</summary>
            /// <param name="id" type="String">The id of the Persistent Object.</param>
            /// <param name="objectId" type="String">The object id of the Persistent Object.</param>

            selectProgramUnitItem(function (item) { return item.persistentObject != null && item.persistentObject.id == id && (item.objectId == objectId || (isNullOrEmpty(item.objectId) && isNullOrEmpty(objectId))); });
        };

        this.trackPageView = function () {
            /// <summary>Tracks the current page navigation with Google Analytics if enabled.</summary>

            if (!this.isCore && typeof (_gaq) != "undefined" && !isNullOrWhiteSpace(this.analyticsKey)) {
                var hash = hasher.getHash();
                if (hash.length == 0 || hash.startsWith('PersistentObjectFromAction.'))
                    return; // NOTE: Actions are tracked when invoked

                var currentPage = this.currentPage;
                if (currentPage == null)
                    return;

                _gaq.push(['_setCustomVar', 1, 'UserName', app.userName, 1]);

                if (hash != lastPageView) {
                    _gaq.push(['_trackPageview', hash]);
                    lastPageView = hash;
                }
            }
        };

        this.trackEvent = function (action, option, owner) {
            /// <summary>Tracks the custom action with Google Analytics if enabled.</summary>

            if (!this.isCore && typeof (_gaq) != "undefined" && !isNullOrWhiteSpace(this.analyticsKey)) {
                var page = 'Unknown';
                var type = 'Unknown';
                var currentPage = this.currentPage;

                if (owner != null) {
                    var ctor = owner.constructor;
                    if (ctor == Query) {
                        page = 'Query';
                        if (currentPage != null && currentPage.persistentObject != null)
                            type = currentPage.persistentObject.type;
                    }
                    else if (ctor == PersistentObject) {
                        page = 'PersistentObject';
                        if (currentPage != null)
                            type = currentPage.type;
                    }
                }

                _gaq.push(['_setCustomVar', 1, 'UserName', this.userName, 1]);
                _gaq.push(['_setCustomVar', 2, 'Page', page, 2]);
                _gaq.push(['_setCustomVar', 3, 'Type', type, 2]);
                _gaq.push(['_setCustomVar', 4, 'Option', option, 2]);

                _gaq.push(['_trackEvent', "Action", action]);
            }
        };

        this.openProgramUnitItem = function (pui, filterName, pu, replace) {
            /// <summary>Is called when a Program Unit Item is opened and can be used to intercept or change the behavior.</summary>

            if (pu == null)
                pu = this.programUnits.selectedItem();

            var self = this;
            if (pui.query != null) {
                if (typeof (filterName) == "undefined")
                    filterName = null;

                this.gateway.getQuery(pui.query.id, filterName, function (result) {
                    var path = self.getUrlForQuery(result, filterName, pu);
                    result.parent = pui.parent;

                    self.pageObjects[path] = result;
                    self.navigate(path, replace);
                });
            }
            else {
                this.gateway.getPersistentObject(null, pui.persistentObject.id, pui.objectId, function (result) {
                    self.openPersistentObject(result, false, pu, replace);
                });
            }
        };

        this.spin = function (start, method, data) {
            /// <summary>Starts or stops the spinner.</summary>
            /// <param name="start" type="Boolean">Will start the spinner if true; otherwise stops the spinner if false</param>
            /// <param name="method" type="String" optional="true">The gateway method that was invoked.</param>
            /// <param name="data" optional="true">The data that was used to invoke the gateway method.</param>

            if (this.isCore)
                return;

            if (method != "executeQuery") {
                if (start)
                    $("#content").spin(this.settings.defaultSpinnerOptions);
                else
                    $("#content").spin(false);
            }
        };

        this.saveUserSettings = function (onCompleted, onError) {
            if (this.userSettingsId != "00000000-0000-0000-0000-000000000000") {
                var self = this;
                var save = function (po) {
                    userSettingsObj = po;

                    po.setAttributeValue("Settings", JSON.stringify(self.userSettings));
                    po.save(onCompleted, onError);
                };

                if (userSettingsObj == null)
                    this.gateway.getPersistentObject(null, this.userSettingsId, null, save, onError);
                else
                    save(userSettingsObj);
            }
            else
                localStorage["UserSettings"] = JSON.stringify(this.userSettings);
        };

        this._onConstructPersistentObject = function (obj) {
            if (obj.isSystem)
                return;

            try {
                this.onConstructPersistentObject(obj);

                var code = this.code[obj.id];
                if (code != null && typeof (code.onConstruct) == "function")
                    code.onConstruct(obj);

                var onPo = this.onPersistentObject[obj.type];
                if (onPo != null && typeof (onPo.onConstruct) == "function")
                    onPo.onConstruct(obj);
            }
            catch (e) {
                this.showException("JavaScript: " + (e.message || e));
            }
        };

        this.onConstructPersistentObject = function (obj) {
            /// <summary>Is called when a Persistent Object is constructed.</summary>
            /// <param name="obj" type="PersistentObject">The persistent object that is constructed.</param>
        };

        this._onConstructQuery = function (query) {
            if (query.isSystem)
                return;

            try {
                this.onConstructQuery(query);

                var code = this.code[query.persistentObject.id];
                if (code != null && typeof (code.onConstructQuery) == "function")
                    code.onConstructQuery(query);

                var onPo = this.onPersistentObject[query.persistentObject.type];
                if (onPo != null && typeof (onPo.onConstructQuery) == "function")
                    onPo.onConstructQuery(query);
            }
            catch (e) {
                this.showException("JavaScript: " + (e.message || e));
            }
        };

        this.onConstructQuery = function (query) {
            /// <summary>Is called when a Query is constructed.</summary>
            /// <param name="query" type="Query">The query that is constructed.</param>
        };
    }

    window.onbeforeunload = function (e) {
        if (app.hasUnsavedChanges()) {
            var confirmationMessage = app.getTranslatedMessage("PagesWithUnsavedChanges");

            (e || window.event).returnValue = confirmationMessage; //Gecko + IE
            return confirmationMessage; //Webkit, Safari, Chrome etc.
        }
    };

    return window.app = app;
})(window, jQuery);
