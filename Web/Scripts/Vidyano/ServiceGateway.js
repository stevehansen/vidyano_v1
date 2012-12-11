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

    this._createData = function() {
        var data = {
            userName: app.userName,
            authToken: app.getAuthToken(),
        };

        if (app.session != null)
            data.session = app.session.toServiceObject();
        
        if (app.settings.applicationSpecificPersistentObjects != null)
            data.applicationSpecificPersistentObjects = app.settings.applicationSpecificPersistentObjects;

        if ($.browser.mobile)
            data.isMobile = true;

        if (app.uniqueId != null)
            data.uniqueId = app.uniqueId;
        
        return data;
    };

    this.executeQuery = function (parent, query, filterName, asLookup, onCompleted, onError) {
        /// <summary>Executes the specified query on the service.</summary>
        /// <param name="parent" type="PersistentObject">The optional parent that should be used for the query.</param>
        /// <param name="query" type="Query">The query that should be executed.</param>
        /// <param name="filterName" type="String">The optional filter name that should be executed.</param>
        /// <param name="asLookup" type="Boolean">The optional argument specifing that the query should be executed as lookup (for AddReference action).</param>
        /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
        /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

        var data = this._createData();
        data.query = query.toServiceObject();
        if (parent != null)
            data.parent = parent.toServiceObject();
        if (filterName != null)
            data.filterName = filterName;
        if (asLookup)
            data.asLookup = true;

        app.spin(true, "executeQuery", data);

        $.postJSON(this.serviceUri + "ExecuteQuery", data, function (result) {
            app.spin(false);

            if (result.exception == null) {
                query.setResult(result.result);

                if (typeof (onCompleted) == "function")
                    onCompleted(query);

                app.trackPageView();
            }
            else {
                query.showNotification(result.exception, "Error");

                if (typeof (onError) == "function")
                    onError(result.exception);
            }
        }, function (exception) {
            app.spin(false);

            query.showNotification(exception, "Error");

            if (typeof (onError) == "function")
                onError(exception);
        });
    };

    this.executeAction = function (action, parent, query, selectedItems, parameters, onCompleted, onError) {
        /// <summary>Executes the specified action on the service.</summary>
        /// <param name="action" type="String">The name of the action that should be executed.</param>
        /// <param name="parent" type="PersistentObject">The optional parent that should be used for the action.</param>
        /// <param name="query" type="Query">The optional query that should be used for the action.</param>
        /// <param name="selectedItems" type="Array">The optional selected items for the query.</param>
        /// <param name="parameters">The optional argument specifing that the query should be executed as lookup (for AddReference action).</param>
        /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
        /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

        var data = this._createData();
        data.action = action;
        if (parent != null)
            data.parent = parent.toServiceObject();
        if (query != null)
            data.query = query.toServiceObject();
        if (selectedItems != null)
            data.selectedItems = selectedItems.select(function(si) { return si.toServiceObject(); });
        if (parameters != null)
            data.parameters = parameters;

        app.spin(true, "executeAction", data);

        var handleResult = function (result) {
            app.spin(false);

            if (result.exception == null) {
                if (typeof (onCompleted) == "function")
                    onCompleted(result.result != null ? new PersistentObject(result.result) : null);
            }
            else {
                if (typeof (onError) == "function")
                    onError(result.exception);
                else 
                    (query != null ? query : parent).showNotification(result.exception, "Error");
            }
        };

        if (parent != null) {
            var inputs = parent._inputs.where(function (input) { return input.input.isChanged; });
            if (inputs.length > 0) {
                if (typeof (window.FileReader) !== 'undefined' && typeof (window.FileReader.prototype.readAsDataURL) !== 'undefined') {
                    // NOTE: Use HTML5 file
                    var tm = new TaskManager();
                    inputs.run(function (item) {
                        var file = item.input[0].files[0];
                        if (file) {
                            tm.startTask(function (t) {
                                var reader = new window.FileReader();
                                reader.onload = function (event) {
                                    if (item.attribute.value != null) {
                                        item.attribute.value = event.target.result.match(/,(.*)$/)[1];
                                    }
                                    item.attribute.isValueChanged = true;

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
                clonedForm.attr({ action: this.serviceUri + "ExecuteAction", target: name });
                clonedForm.find('input[name=data]').val(JSON.stringify(data));
                inputs.where(function (item) { return item.input[0].value != ""; }).run(function (item) {
                    var input = $(item.input);
                    input.attr('name', item.attribute.name);
                    input.appendTo(clonedForm);
                });

                // NOTE: The first load event gets fired after the iframe has been injected into the DOM, and is used to prepare the actual submission.
                iframe.bind("load", function () {
                    // NOTE: The second load event gets fired when the response to the form submission is received. The implementation detects whether the actual payload is embedded in a <textarea> element, and prepares the required conversions to be made in that case.
                    iframe.unbind("load").bind("load", function () {
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

        $.postJSON(this.serviceUri + "ExecuteAction", data, handleResult);
    };

    this.getQuery = function (id, filterName, onCompleted, onError) {
        /// <summary>Requests the specified query from the service.</summary>
        /// <param name="id" type="String">The id or name of the query that should be requested.</param>
        /// <param name="filterName" type="String">The optional filter name that should be used when getting the query.</param>
        /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
        /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

        var data = this._createData();
        data.id = id;
        if (filterName != null)
            data.filterName = filterName;

        app.spin(true, "getQuery", data);

        $.postJSON(this.serviceUri + "GetQuery", data, function (result) {
            app.spin(false);

            if (result.exception == null) {
                var query = new Query(result.query, null);
                query.filterDisplayName = filterName;

                if (typeof (onCompleted) == "function")
                    onCompleted(query);

                setTimeout(function () { app.spin(false); }, 10);

                app.trackPageView();
            }
            else {
                app.showException(result.exception);

                if (typeof (onError) == "function")
                    onError(result.exception);
            }
        });
    };

    this.getPersistentObject = function (parent, persistentObjectTypeId, objectId, onCompleted, onError) {
        /// <summary>Requests the specified Persistent Object from the service.</summary>
        /// <param name="parent" type="PersistentObject">The optional parent that should be used.</param>
        /// <param name="persistentObjectTypeId" type="String">The id or name of the Persistent Object's type.</param>
        /// <param name="objectId" type="String">The optional id that should be used for getting the object.</param>
        /// <param name="onCompleted" type="Function">The optional function that should be called when the operation completed.</param>
        /// <param name="onError" type="Function">The optional function that should be called when the operation failed.</param>

        var data = this._createData();
        data.persistentObjectTypeId = persistentObjectTypeId;
        data.objectId = objectId;
        if (parent != null)
            data.parent = parent.toServiceObject();

        app.spin(true, "getPersistentObject", data);

        $.postJSON(this.serviceUri + "GetPersistentObject", data, function (result) {
            app.spin(false);

            if (result.exception == null) {
                var newPo = new PersistentObject(result.result);
                if (!newPo.isSystem) {
                    var onPo = app.onPersistentObject[newPo.type];
                    if (onPo != null && onPo.receive != null)
                        onPo.receive(newPo);
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
        });
    };

    this.getApplication = function (userName, userPass, onCompleted, onError) {
        var data = this._createData();
        if (data.userName == null)
            data.userName = userName;
        if (data.authToken == null)
            data.password = userPass;
        
        var showError = function (message) {
            app.spin(false);
            if (typeof (onError) == "function")
                onError(message);
        };

        app.spin(true, "getApplication", data);

        $.postJSON(this.serviceUri + "GetApplication", data, function (result) {
            app.lastError = result.exception;
            if (result.exception == null) {
                app.userName = data.userName;
                CultureInfo.currentCulture = CultureInfo.cultures[result.userLanguage] || CultureInfo.invariantCulture;

                var po = new PersistentObject(result.application);
                app.persistentObject = po;

                app.userId = po.getAttributeValue("UserId");
                app.friendlyUserName = po.getAttributeValue("FriendlyUserName") || app.userName;
                app.feedbackId = po.getAttributeValue("FeedbackId");
                app.userSettingsId = po.getAttributeValue("UserSettingsId");
                app.globalSearchId = po.getAttributeValue("GlobalSearchId");
                app.analyticsKey = po.getAttributeValue("AnalyticsKey");

                var routes = JSON.parse(po.getAttributeValue("Routes"));
                if (!isNullOrEmpty(routes) && !app.isCore) {
                    var createPersistentObjectRoute = function (route) {
                        return crossroads.addRoute(new RegExp("^/?" + route + "(?:/(.+))?$"), function (objectId) {
                            app.ensureInitialized(showPersistentObject, [routes.persistentObjects[route], objectId]);
                        });
                    };
                    var createQueryRoute = function (route) {
                        return crossroads.addRoute(new RegExp("^/?" + route + "(?:/(.+))?$"), function (filterName) {
                            app.ensureInitialized(showQueryPage, [routes.queries[route], filterName]);
                        });
                    };
                    var createProgramUnitRoute = function (route) {
                        return crossroads.addRoute(route, function () {
                            app.ensureInitialized(showProgramUnit, [routes.programUnits[route]]);
                        });
                    };

                    for (var poRoute in routes.persistentObjects) {
                        app.customRoutes[routes.persistentObjects[poRoute]] = {
                            crossroadsRoute: createPersistentObjectRoute(poRoute),
                            name: poRoute
                        };
                    }
                    for (var queryRoute in routes.queries) {
                        app.customRoutes[routes.queries[queryRoute]] = {
                            crossroadsRoute: createQueryRoute(queryRoute),
                            name: queryRoute
                        };
                    }
                    for (var puRoute in routes.programUnits) {
                        app.customRoutes[routes.programUnits[puRoute]] = {
                            crossroadsRoute: createProgramUnitRoute(puRoute),
                            name: puRoute
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

                var tm = new TaskManager();

                var messagesQuery = po.queries.firstOrDefault(function (q) { return q.name == "ClientMessages"; });
                if (messagesQuery != null) {
                    if (!messagesQuery.hasSearched)
                        tm.startTask(function (t) {
                            messagesQuery.search(function (query) {
                                try {
                                    app.updateMessages(query);
                                    tm.markDone(t);
                                }
                                catch (ex) {
                                    tm.markError(t, "Unable to load client messages. (" + ex + ")");
                                }
                            });
                        });
                    else
                        app.updateMessages(messagesQuery);
                }

                var actionsQuery = po.queries.firstOrDefault(function (q) { return q.name == "Actions"; });
                if (actionsQuery != null) {
                    if (!actionsQuery.hasSearched)
                        tm.startTask(function (t) {
                            actionsQuery.search(function (query) {
                                try {
                                    Actions.initializeActions(query);
                                    tm.markDone(t);
                                }
                                catch (ex) {
                                    tm.markError(t, "Unable to load actions. (" + ex + ")");
                                }
                            });
                        });
                    else
                        Actions.initializeActions(actionsQuery);
                }

                if (typeof (Resource) != "undefined") {
                    var resourcesQuery = po.queries.firstOrDefault(function (q) { return q.name == "Resources"; });
                    if (resourcesQuery != null) {
                        if (!resourcesQuery.hasSearched)
                            tm.startTask(function (t) {
                                resourcesQuery.search(function (query) {
                                    try {
                                        app.updateResources(query);
                                        tm.markDone(t);
                                    }
                                    catch (ex) {
                                        tm.markError(t, "Unable to load resources. (" + ex + ")");
                                    }
                                });
                            });
                        else
                            app.updateResources(resourcesQuery);
                    }
                }

                app.spin(false);
                tm.waitForAll(onCompleted, app.showException);

                app.isTrial(result.isTrial);

                try {
                    app.onInitialized();
                }
                catch (e) {
                    showError(e);
                }
            } else {
                showError(result.exception);
            }
        }, showError);
    };

    this.getStream = function (obj, action, parent, query, selectedItems, parameters) {
        var data = this._createData();
        data.action = action;
        if (obj != null)
            data.id = obj.objectId;
        if (parent != null)
            data.parent = parent.toServiceObject();
        if (query != null)
            data.query = query.toServiceObject();
        if (selectedItems != null)
            data.selectedItems = selectedItems.select(function(si) { return si.toServiceObject(); });
        if (parameters != null)
            data.parameters = parameters;
        
        var name = "iframe-vidyano-download";
        var iframe = $("iframe[name='" + name + "']");
        if (iframe.length == 0) {
            iframe = $("<iframe src='javascript:false;' name='" + name + "'></iframe>").css({ position: 'absolute', top: '-1000px', left: '-1000px' });
            $("body").append(iframe);
        }

        var form = $("<form enctype='multipart/form-data' encoding='multipart/form-data' method='post'><input type='hidden' name='data'></input></form>"); //.hide();
        form.attr({ action: this.serviceUri + "GetStream", target: name });
        form.find('input[name=data]').val(JSON.stringify(data));
        $("body").append(form);

        form.submit().remove();
    };
}

ServiceGateway.getDate = function (yearString, monthString, dayString, hourString, minuteString, secondString, msString) {
    var year = parseInt(yearString, 10);
    var month = parseInt(monthString, 10) - 1;
    var day = parseInt(dayString, 10);
    var hour = parseInt(hourString, 10);
    var minutes = parseInt(minuteString, 10);
    var seconds = parseInt(secondString, 10);
    var ms = msString != null ? parseInt(msString, 10) : 0;
    var result = new Date();

    result.setFullYear(year, month, day);
    result.setHours(hour, minutes, seconds, ms);

    return result;
};

ServiceGateway.fromServiceString = function (value, typeName) {
    /// <summary>Converts the service string to the correct type.</summary>
    /// <param name="value" type="String">The value that should be converted.</param>
    /// <param name="typeName" type="String">The name of the data type.</param>

    if (typeName == "Decimal" || typeName == "NullableDecimal" || typeName == "Single" || typeName == "NullableSingle" || typeName == "Double" || typeName == "NullableDouble")
        return !isNullOrEmpty(value) ? parseFloat(value) : null;
    else if (typeName == "Int16" || typeName == "NullableInt16" || typeName == "Int32" || typeName == "NullableInt32" || typeName == "Int64" || typeName == "NullableInt64" || typeName == "Byte" || typeName == "NullableByte" || typeName == "SByte" || typeName == "NullableSByte")
        return !isNullOrEmpty(value) ? parseInt(value, 10) : null;
    else if (typeName == "Date" || typeName == "NullableDate" || typeName == "DateTime" || typeName == "NullableDateTime" || typeName == "DateTimeOffset" || typeName == "NullableDateTimeOffset") {
        // Example format: 17-07-2003 00:00:00[.000] [+00:00]
        if (!isNullOrEmpty(value) && value.length >= 19) {
            var parts = value.split(" ").where(function (part) {
                return !isNullOrEmpty(part);
            });
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
    }
    else if (typeName == "Time" || typeName == "NullableTime")
        return ServiceGateway.toServiceString(value, typeName);
    else if (value != null && (typeName == "Boolean" || typeName == "NullableBoolean" || typeName == "YesNo"))
        return Boolean.parse(value);

    return value;
};

ServiceGateway.toServiceString = function (value, typeName) {
    /// <summary>Converts the value to a string understandable for the Service.</summary>
    /// <param name="value">The value to convert</param>
    /// <param name="typeName">The name of the data type to convert the value from. This will be used to determine the correct conversion.</param>
    var functions = {
        getServiceTimeString: function (timeString, defaultValue) {
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
        }
    };

    if (ServiceGateway.isNumericType(typeName)) {
        if (isNullOrEmpty(value) && !typeName.startsWith("Nullable"))
            return "0";
    }
    else if (typeName == "Date" || typeName == "DateTime" || typeName == "NullableDate" || typeName == "NullableDateTime") {
        if (!isNullOrEmpty(value)) {
            var date = value;
            if (typeof(date) == "string")
                date = new Date(value);

            return date.format("dd-MM-yyyy HH:mm:ss.fff");
        }
    }
    else if (typeName == "DateTimeOffset" || typeName == "NullableDateTimeOffset") {
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
    }
    else if (typeName == "Boolean" || typeName == "YesNo" || typeName == "NullableBoolean") {
        if (value == null)
            return null;
        
        if (typeof (value) == "string")
            value = Boolean.parse(value);

        return value ? "true" : "false";
    }
    else if (typeName == "Time")
        return functions.getServiceTimeString(value, "0:00:00:00.0000000");
    else if (typeName == "NullableTime")
        return functions.getServiceTimeString(value, null);

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