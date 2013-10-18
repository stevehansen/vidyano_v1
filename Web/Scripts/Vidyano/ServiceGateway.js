/// <reference path="ActionBase.js" />
/// <reference path="Application.js" />
/// <reference path="Common.js" />
/// <reference path="CultureInfo.js" />
/// <reference path="Pages.js" />
/// <reference path="PersistentObject.js" />
/// <reference path="Query.js" />
/// <reference path="Resource.js" />
/// <reference path="ProgramUnit.js" />

function ServiceGateway(serviceUri) {
    this.serviceUri = serviceUri;
}

ServiceGateway.prototype._createData = function (method, data) {
    data = data || {};

    if (method != "getApplication") {
        data.userName = app.userName;
        data.authToken = app.getAuthToken();
        data._method = method;
    }

    if (app.session != null)
        data.session = app.session.toServiceObject();

    if (app.settings.language != null)
        data.requestedLanguage = app.settings.language;

    if (app.isMobile)
        data.isMobile = true;

    if (app.uniqueId != null)
        data.uniqueId = app.uniqueId;

    if (app.isProfiling != null)
        data.profile = true;

    return data;
};

ServiceGateway.prototype._createUri = function (method) {
    var uri = this.serviceUri;
    if (!isNullOrEmpty(uri) && !uri.endsWith('/'))
        uri += '/';
    return uri + method;
};

ServiceGateway.prototype.preExecuteQuery = function (parent, query, filterName, asLookup, data, onCompleted, onError) {
};

ServiceGateway.prototype.executeQuery = function (parent, query, filterName, asLookup, onCompleted, onError) {
    /// <summary>Executes the specified query on the service.</summary>
    /// <param name="parent" type="PersistentObject">The optional parent that should be used for the query.</param>
    /// <param name="query" type="Query">The query that should be executed.</param>
    /// <param name="filterName" type="String">The optional filter name that should be executed.</param>
    /// <param name="asLookup" type="Boolean">The optional argument specifing that the query should be executed as lookup (for AddReference action).</param>
    /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
    /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

    var data = this._createData("executeQuery");
    data.query = query.toServiceObject();
    if (parent != null)
        data.parent = parent.toServiceObject();
    if (filterName != null)
        data.filterName = filterName;
    if (asLookup)
        data.asLookup = true;

    if (this.preExecuteQuery(parent, query, filterName, asLookup, data, onCompleted, onError))
        return;

    app.spin(true, "executeQuery", data);

    var self = this;
    $.postJSON(this._createUri("ExecuteQuery"), data, function (result) {
        app.spin(false);

        self.postExecuteQuery(parent, query, result, onCompleted, onError);
    }, function (exception) {
        app.spin(false);

        self.postExecuteQuery(parent, query, { exception: exception }, onCompleted, onError);
    });
};

ServiceGateway.prototype.postExecuteQuery = function (parent, query, result, onCompleted, onError) {
    if (result.exception == null) {
        query.setResult(result.result);

        if (typeof (onCompleted) == "function")
            onCompleted(query, { result: result });

        app.trackPageView();
    }
    else {
        query.showNotification(result.exception, "Error");

        if (typeof (onError) == "function")
            onError(result.exception);
    }
};

ServiceGateway.prototype.preExecuteAction = function (action, parent, query, selectedItems, parameters, data, onCompleted, onError) {
};

ServiceGateway.prototype.executeAction = function (action, parent, query, selectedItems, parameters, onCompleted, onError) {
    /// <summary>Executes the specified action on the service.</summary>
    /// <param name="action" type="String">The name of the action that should be executed.</param>
    /// <param name="parent" type="PersistentObject">The optional parent that should be used for the action.</param>
    /// <param name="query" type="Query">The optional query that should be used for the action.</param>
    /// <param name="selectedItems" type="Array">The optional selected items for the query.</param>
    /// <param name="parameters">The optional argument specifing that the query should be executed as lookup (for AddReference action).</param>
    /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
    /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

    var data = this._createData("executeAction");
    data.action = action;
    if (parent != null)
        data.parent = parent.toServiceObject();
    if (query != null)
        data.query = query.toServiceObject();
    if (selectedItems != null)
        data.selectedItems = selectedItems.map(function (si) { return si.toServiceObject(); });
    if (parameters != null)
        data.parameters = parameters;

    if (this.preExecuteAction(action, parent, query, selectedItems, parameters, data, onCompleted, onError))
        return;

    if (parent == null || parent.id != app.userSettingsId || parent.objectId != null)
        app.spin(true, "executeAction", data);

    var self = this;
    var handleResult = function (result) {
        app.spin(false);

        self.postExecuteAction(action, parent, query, selectedItems, parameters, result, onCompleted, onError);
    };

    if (parent != null) {
        var inputs = parent._inputs.filter(function (input) { return input.input.isChanged; });
        if (inputs.length > 0) {
            if (typeof (window.FileReader) !== 'undefined' && typeof (window.FileReader.prototype.readAsDataURL) !== 'undefined') {
                // NOTE: Use HTML5 file
                var tm = new TaskManager();
                inputs.forEach(function (item) {
                    var file = item.input[0].files[0];
                    if (file) {
                        tm.startTask(function (t) {
                            var reader = new window.FileReader();
                            reader.onload = function (event) {
                                var fileName = item.attribute.value;
                                item.attribute.value = event.target.result.match(/,(.*)$/)[1];
                                if (item.attribute.type == "BinaryFile")
                                    item.attribute.value = fileName + "|" + item.attribute.value;

                                tm.markDone(t);
                            };
                            reader.onerror = function (e) {
                                tm.markError(t, e);
                            };
                            reader.readAsDataURL(file);
                        });
                    }
                });

                var uri = this.serviceUri + "ExecuteAction";
                tm.waitForAll(function () {
                    data.parent = parent.toServiceObject();
                    $.postJSON(uri, data, handleResult);
                });

                return;
            }

            var name = "iframe-" + $.now();
            var iframe = $("<iframe src='javascript:false;' name='" + name + "'></iframe>").css({ position: 'absolute', top: '-1000px', left: '-1000px' });

            var clonedForm = $("<form enctype='multipart/form-data' encoding='multipart/form-data' method='post'><input type='hidden' name='data'></input></form>"); //.hide();
            clonedForm.attr({ action: this._createUri("ExecuteAction"), target: name });
            clonedForm.find('input[name=data]').val(JSON.stringify(data));
            inputs.filter(function (item) { return item.input[0].value != ""; }).forEach(function (item) {
                var input = $(item.input);
                input.attr('name', item.attribute.name);
                input.appendTo(clonedForm);
            });

            // NOTE: The first load event gets fired after the iframe has been injected into the DOM, and is used to prepare the actual submission.
            iframe.on("load", function () {
                // NOTE: The second load event gets fired when the response to the form submission is received. The implementation detects whether the actual payload is embedded in a <textarea> element, and prepares the required conversions to be made in that case.
                iframe.off("load").on("load", function () {
                    var doc = this.contentWindow ? this.contentWindow.document : (this.contentDocument ? this.contentDocument : this.document),
                    root = doc.documentElement ? doc.documentElement : doc.body,
                    textarea = root.getElementsByTagName("textarea")[0],
                    type = textarea ? textarea.getAttribute("data-type") : null,
                    content = {
                        html: root.innerHTML,
                        text: type ?
                        textarea.value :
                        root ? (root.textContent || root.innerText) : null
                    };

                    var result = JSON.parse(content.text);

                    handleResult(result);

                    if (result.exception == null) {
                        parent._inputs = [];
                        iframe.attr("src", "javascript:false;").remove();
                    }
                });

                clonedForm[0].submit();
            });

            $("body").append(clonedForm, iframe);
            return;
        }
    }

    $.postJSON(this._createUri("ExecuteAction"), data, handleResult, function (exception) {
        handleResult({ exception: exception });
    });
};

ServiceGateway.prototype.postExecuteAction = function (action, parent, query, selectedItems, parameters, result, onCompleted, onError) {
    if (result.exception == null) {
        if (typeof (onCompleted) == "function")
            onCompleted(result.result != null ? new PersistentObject(result.result) : null, { result: result });
    }
    else {
        if (typeof (onError) == "function")
            onError(result.exception);
        else 
            (query != null ? query : parent).showNotification(result.exception, "Error");
    }
};

ServiceGateway.prototype.preGetQuery = function (id, filterName, data, onCompleted, onError) {
};

ServiceGateway.prototype.getQuery = function (id, filterName, onCompleted, onError) {
    /// <summary>Requests the specified query from the service.</summary>
    /// <param name="id" type="String">The id or name of the query that should be requested.</param>
    /// <param name="filterName" type="String">The optional filter name that should be used when getting the query.</param>
    /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
    /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

    if (arguments.length <= 3 && typeof (filterName) == "function") {
        // getQuery(id, onCompleted, onError)
        onError = onCompleted;
        onCompleted = filterName;
        filterName = null;
    }

    var data = this._createData("getQuery");
    data.id = id;
    if (filterName != null)
        data.filterName = filterName;

    if (this.preGetQuery(id, filterName, data, onCompleted, onError))
        return;

    app.spin(true, "getQuery", data);

    var self = this;
    $.postJSON(this._createUri("GetQuery"), data, function (result) {
        app.spin(false);

        self.postGetQuery(id, filterName, result, onCompleted, onError);
    }, function (exception) {
        app.spin(false);

        self.postGetQuery(id, filterName, { exception: exception }, onCompleted, onError);
    });
};

ServiceGateway.prototype.postGetQuery = function (id, filterName, result, onCompleted, onError) {
    if (result.exception == null) {
        var query = new Query(result.query, null);
        query.filterDisplayName = filterName;

        if (typeof (onCompleted) == "function")
            onCompleted(query, { result: result });

        setTimeout(function () { app.spin(false); }, 10);

        app.trackPageView();
    }
    else {
        if (typeof (onError) == "function")
            onError(result.exception);
        else
            app.showException(result.exception);
    }
};

ServiceGateway.prototype.preGetPersistentObject = function (parent, persistentObjectTypeId, objectId, data, onCompleted, onError) {
};

ServiceGateway.prototype.getPersistentObject = function (parent, persistentObjectTypeId, objectId, onCompleted, onError) {
    /// <summary>Requests the specified Persistent Object from the service.</summary>
    /// <param name="parent" type="PersistentObject">The optional parent that should be used.</param>
    /// <param name="persistentObjectTypeId" type="String">The id or name of the Persistent Object's type.</param>
    /// <param name="objectId" type="String">The optional id that should be used for getting the object.</param>
    /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
    /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

    var data = this._createData("getPersistentObject");
    data.persistentObjectTypeId = persistentObjectTypeId;
    data.objectId = objectId;
    if (parent != null)
        data.parent = parent.toServiceObject();

    if (this.preGetPersistentObject(parent, persistentObjectTypeId, objectId, data, onCompleted, onError))
        return;

    app.spin(true, "getPersistentObject", data);

    var self = this;
    $.postJSON(this._createUri("GetPersistentObject"), data, function (result) {
        app.spin(false);

        self.postGetPersistentObject(parent, persistentObjectTypeId, objectId, result, onCompleted, onError);
    }, function (exception) {
        app.spin(false);

        self.postGetPersistentObject(parent, persistentObjectTypeId, objectId, { exception: exception }, onCompleted, onError);
    });
};

ServiceGateway.prototype.postGetPersistentObject = function (parent, persistentObjectTypeId, objectId, result, onCompleted, onError) {
    if (result.exception == null) {
        var newPo = new PersistentObject(result.result);
        if (!newPo.isSystem) {
            var onPo = app.onPersistentObject[newPo.type];
            if (onPo != null) {
                try {
                    if (onPo.onReceive != null)
                        onPo.onReceive(newPo);
                    else if (onPo.receive != null)
                        onPo.receive(newPo);
                }
                catch (e) {
                    app.showException("JavaScript: " + (e.message || e));
                }
            }
        }

        if (typeof (onCompleted) == "function")
            onCompleted(newPo);

        app.trackPageView();
    }
    else {
        app.showException(result.exception);

        if (typeof (onError) == "function")
            onError(result.exception);
    }
};

ServiceGateway.prototype.preGetApplication = function (userName, userPass, data, onCompleted, onError) {
};

ServiceGateway.prototype.getApplication = function (userName, userPass, onCompleted, onError) {
    var data = this._createData("getApplication");
    data.userName = userName;
    if (userPass != null) {
        data.password = userPass;
        delete data.authToken;
    }
    else {
        data.authToken = app.getAuthToken();
        delete data.password;
    }

    if (this.preGetApplication(userName, userPass, data, onCompleted, onError))
        return;

    app.spin(true, "getApplication", data);

    var self = this;
    $.postJSON(this._createUri("GetApplication"), data, function (result) {
        self.postGetApplication(userName, userPass, result, onCompleted, onError);
    }, function (exception) {
        self.postGetApplication(userName, userPass, { exception: exception }, onCompleted, onError);
    });
};

ServiceGateway.prototype.postGetApplication = function (userName, userPass, result, onCompleted, onError) {
    var showError = function (message) {
        app.spin(false);

        if (typeof (onError) == "function")
            onError(message);
    };

    app.lastError = result.exception;
    if (result.exception == null) {
        var po = new PersistentObject(result.application);
        if (!isNullOrEmpty(po.notification)) {
            showError(po.notification);
            return;
        }

        app.userName = result.userName;
        CultureInfo.currentCulture = CultureInfo.cultures[result.userCultureInfo] || CultureInfo.cultures[result.userLanguage] || CultureInfo.invariantCulture;

        app.persistentObject = po;

        app.canProfile = ServiceGateway.fromServiceString(app.persistentObject.getAttributeValue("CanProfile"), "Boolean");
        app.userId = po.getAttributeValue("UserId");
        app.friendlyUserName = po.getAttributeValue("FriendlyUserName") || app.userName;
        app.feedbackId = po.getAttributeValue("FeedbackId");
        app.userSettingsId = po.getAttributeValue("UserSettingsId");
        app.globalSearchId = po.getAttributeValue("GlobalSearchId");
        app.analyticsKey = po.getAttributeValue("AnalyticsKey");

        var userSettings = po.getAttributeValue("UserSettings");
        app.userSettings = JSON.parse(isNullOrEmpty(userSettings) ? (localStorage["UserSettings"] || "{}") : userSettings);

        var routes = JSON.parse(po.getAttributeValue("Routes"));
        if (!isNullOrEmpty(routes) && !app.isCore) {
            var createProgramUnitRoute = function (route, routeId) {
                return crossroads.addRoute(route, function () {
                    app._programUnitName = route;
                    app.ensureInitialized(showProgramUnit, [routeId]);
                });
            };

            var programUnits = [];
            for (var puRoute in routes.programUnits) {
                programUnits.push(puRoute);

                var puId = routes.programUnits[puRoute];
                app.customRoutes[puId] = {
                    crossroadsRoute: createProgramUnitRoute(puRoute, puId),
                    name: puRoute
                };
            }
            var pus = programUnits.join("|");

            var createPersistentObjectRoute = function (route, routeId, pu) {
                if (pu) {
                    return crossroads.addRoute(new RegExp("^/?(" + pus + ")/" + route + "(?:/(.+))?$"), function (puName, objectId) {
                        app._programUnitName = puName;
                        app.ensureInitialized(showPersistentObject, [routeId, objectId]);
                    });
                }

                return crossroads.addRoute(new RegExp("^/?" + route + "(?:/(.+))?$"), function (objectId) {
                    app.ensureInitialized(showPersistentObject, [routeId, objectId]);
                });
            };
            var createQueryRoute = function (route, routeId, pu) {
                if (pu) {
                    return crossroads.addRoute(new RegExp("^/?(" + pus + ")/" + route + "(?:/(.+))?$"), function (puName, filterName) {
                        app._programUnitName = puName;
                        app.ensureInitialized(showQueryPage, [routeId, filterName]);
                    });
                }

                return crossroads.addRoute(new RegExp("^/?" + route + "(?:/(.+))?$"), function (filterName) {
                    app.ensureInitialized(showQueryPage, [routeId, filterName]);
                });
            };

            for (var poRouteName in routes.persistentObjects) {
                var poId = routes.persistentObjects[poRouteName];
                app.customRoutes[poId] = {
                    crossroadsRoute: createPersistentObjectRoute(poRouteName, poId),
                    name: poRouteName
                };

                app.customRoutes["PU." + poId] = {
                    crossroadsRoute: createPersistentObjectRoute(poRouteName, poId, true),
                    name: "PU." + poRouteName
                };
            }
            for (var queryRoute in routes.queries) {
                var queryId = routes.queries[queryRoute];
                app.customRoutes[queryId] = {
                    crossroadsRoute: createQueryRoute(queryRoute, queryId),
                    name: queryRoute
                };

                app.customRoutes["PU." + queryId] = {
                    crossroadsRoute: createQueryRoute(queryRoute, queryId, true),
                    name: "PU." + queryRoute
                };
            }
        }

        var jCode = po.getAttributeValue("Code");
        app.code = !isNullOrEmpty(jCode) ? JSON.parse(jCode) : {};
        for (var id in app.code) {
            for (var name in app.code[id]) {
                try {
                    app.code[id][name] = eval("(" + app.code[id][name] + ")");
                }
                catch (err) {
                    if (window.console && window.console.log)
                        window.console.log("PersistentObject with Id '" + id + "' generated the following error: " + err);
                }
            }
        }

        if (typeof (ProgramUnit) != "undefined")
            app.updateProgramUnits(JSON.parse(po.getAttributeValue("ProgramUnits")));

        if (!isNullOrWhiteSpace(app.analyticsKey)) {
            // NOTE: Initialize Google Analytics
            var addScript = false;
            if (window._gaq == null) {
                window._gaq = [];
                addScript = true;
            }

            _gaq.push(['_setAccount', app.analyticsKey]);
            _gaq.push(['_setDomainName', 'none']); // NOTE: Debugging code
            app.trackPageView();

            if (addScript) {
                var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
                ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
                var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
            }
        }

        var messagesQuery = po.queries.firstOrDefault(function (q) { return q.name == "ClientMessages"; });
        if (messagesQuery != null)
            app.updateMessages(messagesQuery);

        if (typeof (Resource) != "undefined") {
            var resourcesQuery = po.queries.firstOrDefault(function (q) { return q.name == "Resources"; });
            if (resourcesQuery != null)
                app.updateResources(resourcesQuery);
        }

        var actionsQuery = po.queries.firstOrDefault(function (q) { return q.name == "Actions"; });
        if (actionsQuery != null)
            Actions.initializeActions(actionsQuery);

        app.spin(false);
        onCompleted();

        app.isTrial(result.isTrial);

        if (typeof (localStorage) != "undefined") {
            var changed = false;
            for (var key in localStorage) {
                if (key == "MasterDetailSettings" || key == "QueryGridSettings") {
                    app.userSettings[key] = JSON.parse(localStorage[key]);
                    localStorage.removeItem(key);
                    changed = true;
                }
                else if (key.startsWith("Filters_")) {
                    app.userSettings[key] = localStorage[key];
                    localStorage.removeItem(key);
                    changed = true;
                }
            }

            if (changed)
                app.saveUserSettings();
        }

        window.onerror = function (ex) {
            if (window.console && window.console.log)
                window.console.log(ex);
        };

        try {
            app.onInitialized();
        }
        catch (e) {
            showError("app.onInitialized failed:\n" + (e.message || e));
        }
    }
    else
        showError(result.exception);
};

ServiceGateway.prototype.preGetStream = function (obj, action, parent, query, selectedItems, parameters, data) {
};

ServiceGateway.prototype.getStream = function (obj, action, parent, query, selectedItems, parameters) {
    var data = this._createData();
    data.action = action;
    if (obj != null)
        data.id = obj.objectId;
    if (parent != null)
        data.parent = parent.toServiceObject();
    if (query != null)
        data.query = query.toServiceObject();
    if (selectedItems != null)
        data.selectedItems = selectedItems.map(function (si) { return si.toServiceObject(); });
    if (parameters != null)
        data.parameters = parameters;

    if (this.preGetStream(obj, action, parent, query, selectedItems, parameters, data))
        return;

    var name = "iframe-vidyano-download";
    var iframe = $("iframe[name='" + name + "']");
    if (iframe.length == 0) {
        iframe = $("<iframe src='javascript:false;' name='" + name + "'></iframe>").css({ position: 'absolute', top: '-1000px', left: '-1000px' });
        $("body").append(iframe);
    }

    var form = $("<form enctype='multipart/form-data' encoding='multipart/form-data' method='post'><input type='hidden' name='data'></input></form>"); //.hide();
    form.attr({ action: this._createUri("GetStream"), target: name });
    form.find('input[name=data]').val(JSON.stringify(data));
    $("body").append(form);

    form.submit().remove();
};

ServiceGateway.prototype.getClientData = function (onCompleted, onError) {
    $.support.cors = true; // Note: Allows cross domain requests
    $.crossDomain = true;

    $.ajax({
        dataType: "json",
        type: 'GET',
        url: this._createUri("GetClientData"),
        success: onCompleted,
        error: onError
    });
};

ServiceGateway.getDate = function (yearString, monthString, dayString, hourString, minuteString, secondString, msString) {
    var year = parseInt(yearString, 10);
    var month = parseInt(monthString || "1", 10) - 1;
    var day = parseInt(dayString || "1", 10);
    var hour = parseInt(hourString || "0", 10);
    var minutes = parseInt(minuteString || "0", 10);
    var seconds = parseInt(secondString || "0", 10);
    var ms = parseInt(msString || "0", 10);
    
    return new Date(year, month, day, hour, minutes, seconds, ms);
};

ServiceGateway.fromServiceString = function (value, typeName) {
    /// <summary>Converts the service string to the correct type.</summary>
    /// <param name="value" type="String">The value that should be converted.</param>
    /// <param name="typeName" type="String">The name of the data type.</param>

    switch (typeName) {
        case "Decimal":
        case "Single":
        case "Double":
            if (isNullOrEmpty(value))
                return 0.0;

            return parseFloat(value);

        case "NullableDecimal":
        case "NullableSingle":
        case "NullableDouble":
            if (isNullOrEmpty(value))
                return null;

            return parseFloat(value);

        case "Int16":
        case "Int32":
        case "Int64":
        case "Byte":
        case "SByte":
            if (isNullOrEmpty(value))
                return 0;

            return parseInt(value, 10);

        case "NullableInt16":
        case "NullableInt32":
        case "NullableInt64":
        case "NullableByte":
        case "NullableSByte":
            if (isNullOrEmpty(value))
                return null;

            return parseInt(value, 10);

        case "Date":
        case "NullableDate":
        case "DateTime":
        case "NullableDateTime":
        case "DateTimeOffset":
        case "NullableDateTimeOffset":
            // Example format: 17-07-2003 00:00:00[.000] [+00:00]
            if (!isNullOrEmpty(value) && value.length >= 19) {
                var parts = value.split(" ");
                var date = parts[0].split("-");
                var time = parts[1].split(":");
                var dateTime = ServiceGateway.getDate(date[2], date[1], date[0], time[0], time[1], time[2].substring(0, 2), time[2].length > 2 ? time[2].substr(3, 3) : null);
                if (parts.length == 3) {
                    dateTime.netType("DateTimeOffset");
                    dateTime.netOffset(parts[2]);
                }

                return dateTime;
            }

            var now = new Date();
            if (typeName == "Date") {
                now.setHours(0, 0, 0, 0);
                return now;
            }
            else if (typeName == "DateTime")
                return now;
            else if (typeName == "DateTimeOffset") {
                now.netType("DateTimeOffset");
                var zone = now.getTimezoneOffset() * -1;
                var zoneHour = zone / 60;
                var zoneMinutes = zone % 60;
                now.netOffset(String.format("{0}{1:D2}:{2:D2}", zone < 0 ? "-" : "+", zoneHour, zoneMinutes)); // +00:00
                return now;
            }

            return null;

        case "Time":
        case "NullableTime":
            return ServiceGateway.toServiceString(value, typeName);

        case "Boolean":
        case "NullableBoolean":
        case "YesNo":
            return value != null ? Boolean.parse(value) : null;

        default:
            return value;
    }
};

ServiceGateway.toServiceString = function (value, typeName) {
    /// <summary>Converts the value to a string understandable for the Service.</summary>
    /// <param name="value">The value to convert</param>
    /// <param name="typeName">The name of the data type to convert the value from. This will be used to determine the correct conversion.</param>

    switch (typeName) {
        case "NullableDecimal":
        case "Decimal":
        case "NullableSingle":
        case "Single":
        case "NullableDouble":
        case "Double":
        case "NullableInt64":
        case "Int64":
        case "NullableUInt64":
        case "UInt64":
        case "NullableInt32":
        case "Int32":
        case "NullableUInt32":
        case "UInt32":
        case "NullableInt16":
        case "Int16":
        case "NullableUInt16":
        case "UInt16":
        case "NullableByte":
        case "Byte":
        case "NullableSByte":
        case "SByte":
            if (isNullOrEmpty(value) && !typeName.startsWith("Nullable"))
                return "0";

            break;

        case "Date":
        case "NullableDate":
        case "DateTime":
        case "NullableDateTime":
            if (!isNullOrEmpty(value)) {
                var date = value;
                if (typeof (date) == "string")
                    date = new Date(value);

                return date.format("dd-MM-yyyy HH:mm:ss.fff").trimEnd('0').trimEnd('.');
            }

            break;

        case "DateTimeOffset":
        case "NullableDateTimeOffset":
            if (!isNullOrEmpty(value)) {
                var dateOffset = value;
                if (typeof (value) == "string") {
                    if (value.length >= 23 && value.length <= 30) {
                        var dateParts = value.split(" ");

                        dateOffset = new Date(dateParts[0] + " " + dateParts[1]);
                        dateOffset.netOffset(dateParts[2]);
                        dateOffset.netType("DateTimeOffset");
                    }
                    else
                        return null;
                }

                return dateOffset.format("dd-MM-yyyy HH:mm:ss") + " " + (dateOffset.netOffset() || "+00:00");
            }

            break;

        case "Boolean":
        case "NullableBoolean":
        case "YesNo":
            if (value == null)
                return null;

            if (typeof (value) == "string")
                value = Boolean.parse(value);

            return value ? "true" : "false";

        case "Time":
            return ServiceGateway._getServiceTimeString(value, "0:00:00:00.0000000");

        case "NullableTime":
            return ServiceGateway._getServiceTimeString(value, null);
    }

    return typeof (value) == "string" || value == null ? value : String(value);
};

ServiceGateway.isNumericType = function (type) {
    /// <summary>Check the type supplied to see if it is a numeric type.</summary>
    /// <param name="type">The name of the data type to check.</param>
    /// <returns type="Boolean" />

    switch (type) {
        case "NullableDecimal":
        case "Decimal":
        case "NullableSingle":
        case "Single":
        case "NullableDouble":
        case "Double":
        case "NullableInt64":
        case "Int64":
        case "NullableUInt64":
        case "UInt64":
        case "NullableInt32":
        case "Int32":
        case "NullableUInt32":
        case "UInt32":
        case "NullableInt16":
        case "Int16":
        case "NullableUInt16":
        case "UInt16":
        case "NullableByte":
        case "Byte":
        case "NullableSByte":
        case "SByte":
            return true;
    }

    return false;
};

ServiceGateway._getServiceTimeString = function (timeString, defaultValue) {
    if (!isNullOrWhiteSpace(timeString)) {
        timeString = timeString.trim();

        // 00:00.0000000
        var ms = "0000000";
        var parts = timeString.split('.');
        if (parts.length == 2) {
            ms = parts[1];
            timeString = parts[0];
        }
        else if (parts.length != 1)
            return defaultValue;

        var length = timeString.length;
        if (length >= 4) {
            var values = timeString.split(':'), valuesLen = values.length;
            var days = 0, hours, minutes, seconds = 0;

            if ((length == 4 || length == 5) && valuesLen == 2) {
                // [0]0:00
                hours = parseInt(values[0], 10);
                minutes = parseInt(values[1], 10);
            }
            else if ((length == 7 || length == 8) && valuesLen == 3) {
                // [0]0:00:00
                hours = parseInt(values[0], 10);
                minutes = parseInt(values[1], 10);
                seconds = parseInt(values[2], 10);
            }
            else if (length >= 10 && valuesLen == 4) {
                // 0:00:00:00
                days = parseInt(values[0], 10);
                hours = parseInt(values[1], 10);
                minutes = parseInt(values[2], 10);
                seconds = parseInt(values[3], 10);
            }
            else
                return defaultValue;

            if (days != NaN && hours != NaN && minutes != NaN && seconds != NaN && days >= 0 && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59)
                return String.format("{0}:{1:d2}:{2:d2}:{3:d2}.{4}", days, hours, minutes, seconds, ms.padRight(7, '0'));
        }
    }

    return defaultValue;
};