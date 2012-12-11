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

        $(document).ready(function () {
            crossroads.addRoute("", function () { app.ensureInitialized(showHomePage, arguments); });
            crossroads.addRoute("SignIn", signInPage);
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
            return doAction("Edit");
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

        // CodeMirror handling
        if (codeMirror != null) {
            codeMirror.defaults.mode = "javascript";
        }
    }

    function Application() {
        /// <summary>Provides access to current Vidyano application.</summary>

        this.isCore = typeof (hasher) == "undefined" || typeof (crossroads) == "undefined";

        var messages = {};
        var lastPageView = null;

        /// <field name="title" type="String">The title property is used a prefix when updating the document title.</field>
        this.title = document.title;
        this.userName = null;
        this.allowExperimentalFeatures = true;
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
        /// <field name="isTablet">This field indicates whether the current application is running on a tablet browser.</field>
        this.isTablet = navigator.userAgent.match(/(iPad|Android|BlackBerry)/);
        /// <field name="settings">The settings property is used to override default Vidyano settings like useDefaultCredentials and defaultUserName/defaultPassword.</field>
        this.settings =
        {
            defaultSpinnerOptions: { lines: 8, length: 0, width: 5, radius: 8, color: '#0c5d7d', speed: 1, trail: 70, shadow: false, hwaccel: true },
            useDefaultCredentials: false,
            defaultUserName: "Guest",
            defaultPassword: "Guest",
            applicationSpecificPersistentObjects: null
        };

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

        this.currentExceptionHandler = function () { };

        this.navigate = function (url, replace) {
            /// <summary>Navigates to the specified url.</summary>
            /// <param name="url" type="String">The url that should be navigated to.</param>
            /// <param name="replace" type="Boolean">Determines if the current history entry in the browser should be replaced, otherwise a new history entry will be added.</param>

            setTimeout(function () {
                if (replace)
                    hasher.replaceHash(url);
                else
                    hasher.setHash(url);
            }, 0);
        };

        this.dispose = function () {
            /// <summary>Cleans up the application instance.</summary>

            $(".programUnits").empty();
            $(".programUnitItems").empty();

            Actions.showActions(null);

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
            this.setAuthToken(null);
            document.title = this.title;

            messages = {};
            lastPageView = null;

            for (var name in this.customRoutes)
                crossroads.removeRoute(this.customRoutes[name].crossroadsRoute);
            this.customRoutes = {};
        };

        this.staySignedIn = $.cookie("staySignedIn") == "true";

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

            var token = $.cookie("authToken");
            if (isNullOrWhiteSpace(token))
                return this.authToken;

            return token;
        };

        this.returnUrl = function (value) {
            /// <summary>Gets or sets the return url that should be used after sign in.</summary>

            if (typeof (value) == "undefined")
                return $.cookie("returnUrl");

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
            var onError = function (e) {
                app.lastError = e;
                app.redirectToSignIn();
                app.currentExceptionHandler(e);
            };
            if (app.persistentObject == null) {
                if ($.browser.mobile)
                    $("#rootContainer").addClass("mobile");
                
                app.returnUrl(hasher.getHash());
                if ($.cookie("userName") != null && app.getAuthToken() != null) {
                    app.gateway.getApplication($.cookie("userName"), null, function () {
                        $("signOut").show();
                        if (f != null)
                            f.apply(null, Array.prototype.slice.call(args));
                        else
                            crossroads.parse(app.returnUrl());

                        app.returnUrl(null);
                    }, onError);
                }
                else if (app.settings.useDefaultCredentials) {
                    $.cookie("authToken", null);
                    app.staySignedIn = false;
                    $.cookie("staySignedIn", null);
                    $.cookie("userName", null);

                    app.gateway.getApplication(app.settings.defaultUserName, app.settings.defaultPassword, function () {
                        $("signOut").show();
                        if (f != null)
                            f.apply(null, Array.prototype.slice.call(args));
                        else
                            crossroads.parse(app.returnUrl());

                        app.returnUrl(null);
                    }, onError);
                }
                else
                    app.navigate("SignIn");
            }

            else {
                $("signOut").show();
                if (f != null)
                    f.apply(null, Array.prototype.slice.call(args));
                else
                    app.navigate(app.returnUrl(), true);
            }
        };

        if (this.isCore) {
            this.signIn = function (userName, password, onCompleted, onError) {
                this.gateway.getApplication(userName, password, onCompleted, onError);
            };
        }

        this.signOut = function (usingDefaultUser) {
            /// <summary>Sign out the current user, if the application is using the default user it will go directly to the Sign in page.</summary>
            /// <param name="usingDefaultUser" type="Boolean" optional="true">A value indicating if the default user is currently used.</param>

            this.dispose();

            if (!this.isCore) {
                $("#rootContainer").dataContext(null);
                this.navigate(usingDefaultUser || !this.settings.useDefaultCredentials ? "SignIn" : "", true);
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

            return this.settings.useDefaultCredentials && (this.userName == null || this.userName == this.settings.defaultUserName);
        };

        this.redirectToSignIn = function () {
            /// <summary>Redirects the user to the sign in page and remember the current url for after sign in.</summary>

            if (this.isCore)
                return;

            this.returnUrl(hasher.getHash());
            this.navigate("SignIn");
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

            document.title = isNullOrEmpty(title) ? this.title : this.title + " - " + title;
        };

        this.getUrlForPersistentObject = function (po) {
            /// <summary>Gets a value that represents an url for the specified Persistent Object, using custom routes if possible.</summary>
            /// <param name="po" type="PersistentObject">The Persistent Object that should be used to generate an url for.</param>
            /// <returns type="String" />

            var customRoute = this.customRoutes[po.id];
            var url = (customRoute != null ? customRoute.name : ("PersistentObject." + po.id));
            if (!isNullOrEmpty(po.objectId))
                url += "/" + po.objectId;

            return url;
        };

        this.getUrlForQuery = function (query, filterName) {
            /// <summary>Gets a value that represents an url for the specified Query, using custom routes if possible.</summary>
            /// <param name="query" type="Query">The Query that should be used to generate an url for.</param>
            /// <param name="filterName" type="String" optional="true">The optional filter name for the query.</param>
            /// <returns type="String" />

            var id = typeof (query) == "string" ? query : query.id;
            var customRoute = this.customRoutes[id];
            var url = (customRoute != null ? customRoute.name : ("Query." + id));
            if (!isNullOrEmpty(filterName))
                url += "/" + escape(filterName);

            return url;
        };

        this.getUrlForProgramUnit = function (pu) {
            /// <summary>Gets a value that represents an url for the specified Program Unit, using custom routes if possible.</summary>
            /// <param name="pu" type="ProgramUnit">The Program Unit that should be used to generate an url for.</param>
            /// <returns type="String" />

            var id = typeof (pu) == "string" ? pu : pu.id;
            var customRoute = this.customRoutes[id];
            return (customRoute != null ? customRoute.name : ("ProgramUnit." + id));
        };

        this.updateMessages = function (messagesQuery) {
            // NOTE: Internal use only
            messagesQuery.items.run(function (message) {
                messages[message.getValue("Key")] = message.getValue("Value");
            });
        };

        this.updateProgramUnits = function (programUnits) {
            // NOTE: Internal use only
            if (programUnits == null)
                return;

            var self = this;
            this.hasManagement = programUnits.hasManagement;
            this.programUnits = programUnits.units.select(function (item) { return new ProgramUnit(item, self.hasManagement); }).toSelector();

            this.programUnits.onSelectedItemChanged(function (pu) {
                self.programUnits.run(function (p) {
                    if (p.selector != null)
                        p.selector.removeClass("selectedProgramUnit");
                });

                pu.open();
                if (pu.selector != null)
                    pu.selector.addClass("selectedProgramUnit");
            });
        };

        this.getTranslatedMessage = function (key) {
            /// <summary>Gets the translated message for the specified key.</summary>
            /// <param name="key" type="String">The message key.</param>
            /// <returns type="String" />

            var translated = messages[key] || key;

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

            resourcesQuery.items.run(function (item) {
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
                        catch (e) { }
                    }
                }
            });

            this.icons = icons;
            this.templates = templates;
        };

        this.openPersistentObject = function (obj, fromAction) {
            /// <summary>Open the Persistent Object on a new page.</summary>
            /// <param name="obj" type="PersistentObject">The Persistent Object that should be opened.</param>
            /// <param name="fromAction" type="Boolean" optional="true">Specifies if the Persistent Object was opened from an Action.</param>

            if (this.isCore)
                return; // NOTE: Can't open pages

            var path = fromAction ? "PersistentObjectFromAction/" + getRandom() : this.getUrlForPersistentObject(obj);
            obj.getPath = function () { return path; };

            this.pageObjects[path] = obj;
            this.navigate(path);
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
                this.showException(e);
            }
        };

        this.onInitialized = function () {
            /// <summary>Is called when the Application is initialized after the user has logged in.</summary>
        };

        this.onSessionUpdated = function (session) {
            /// <summary>Is called when the Session is updated.</summary>
            /// <param name="session" type="PersistentObject">The current session instance, or null if no session is configured.</param>
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
            if (programUnit != null) {
                if (programUnit.items.length > 0) {
                    var programUnitItem = findItem(programUnit);
                    if (programUnitItem != null) {
                        found = true;

                        if (programUnitItem.element != null)
                            programUnitItem.element.addClass("programUnitItemSelected");
                    }
                }
                else
                    programUnit = null;
            }

            if (!found) {
                app.programUnits.where(function (pu) { return pu != programUnit; }).run(function (pu) {
                    if (!found) {
                        programUnitItem = findItem(pu);
                        if (programUnitItem != null) {
                            found = true;

                            app.returnUrl("DontShowTemplate");
                            app.programUnits.selectedItem(pu);
                            app.returnUrl(null);

                            if (programUnitItem.element != null)
                                programUnitItem.element.addClass("programUnitItemSelected");
                        }
                    }
                });
            }
        };

        this.resetSelectedProgramUnitItem = function () {
            var programUnit = this.programUnits.selectedItem();
            if (programUnit != null) {
                programUnit.items.run(function (item) {
                    if (item.element != null)
                        item.element.removeClass("programUnitItemSelected");

                    if (item.subItems != null)
                        item.subItems.where(function (subItem) { return subItem.element != null; }).run(function (subItem) { subItem.element.removeClass("programUnitItemSelected"); });
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

        this.openProgramUnitItem = function (pui, filterName) {
            /// <summary>Is called when a Program Unit Item is opened and can be used to intercept or change the behavior.</summary>

            var self = this;
            if (pui.query != null) {
                if (typeof (filterName) == "undefined")
                    filterName = null;

                this.gateway.getQuery(pui.query.id, filterName, function (result) {
                    var path = self.getUrlForQuery(result, filterName);
                    result.parent = pui.parent;

                    self.pageObjects[path] = result;
                    self.navigate(path);
                });
            }
            else {
                this.gateway.getPersistentObject(null, pui.persistentObject.id, pui.objectId, function (result) {
                    self.openPersistentObject(result);
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
    }

    return window.app = app;
})(window, jQuery);