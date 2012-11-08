function signInPage() {
    app.setAuthToken(null);
    app.currentPath = 'SignIn';

    var signIn = function () {
        $("#signInSpinner").spin(app.settings.defaultSpinnerOptions);

        $("#userName").attr('disabled', 'disabled');
        $("#userPass").attr('disabled', 'disabled');
        $("#staySignedIn").attr('disabled', 'disabled');

        $("#signIn").button("disable");

        var userName = $("#userName").attr("value");
        app.staySignedIn = $("#staySignedIn").prop("checked");

        app.gateway.getApplication(userName, $("#userPass").attr("value"), function () {
            app.lastError = null;

            if (app.staySignedIn) {
                var exp = new Date();
                exp.setFullYear(exp.getFullYear() + 1);
                $.cookie("userName", userName, { expires: exp });
                $.cookie("staySignedIn", "true", { expires: exp });
            }
            else {
                $.cookie("userName", userName);
                $.cookie("staySignedIn", null);
            }

            $("#content").empty();
            $("#signInSpinner").spin(false);

            $.setVisibilityForState("SignedIn", true);

            var returnUrl = app.returnUrl();
            app.returnUrl(null);

            if ($("#rootContainer").dataContext() == null)
                showHomePage();

            if (!isNullOrWhiteSpace(returnUrl))
                app.navigate(returnUrl, true);
            else if ($.browser.mobile)
                app.navigate("");
        }, function (e) {
            $("#signInSpinner").spin(false);

            $("#signInNotification").showNotification(e, "Error");

            $("#userName").removeAttr('disabled');
            $("#userPass").removeAttr('disabled');
            $("#staySignedIn").removeAttr('disabled');
            $("#signIn").button("enable");
        });
    };

    var signInOnEnter = function (e) {
        if ((e.keyCode || e.which) == 13) {
            signIn();
            e.stopPropagation();
            e.preventDefault();
        }
    };

    $.setVisibilityForState("SignedIn", false);

    var lastError = app.lastError;
    app.dispose();

    $("#rootContainer").html($($.browser.mobile ? "#signin_mobile_template" : "#signin_template").html());
    $("#userName").attr("value", $.cookie("userName"));
    $("#staySignedIn").attr("checked", app.staySignedIn);

    $("#signIn").click(signIn);
    $("#signIn").button();

    var titleContainer = $("#signInBoxApplicationTitle");
    if (titleContainer.length > 0 && !isNullOrWhiteSpace(document.title))
        titleContainer.text(document.title);
    else
        titleContainer.hide();

    $("#userName").on("keypress", signInOnEnter);
    $("#userPass").on("keypress", signInOnEnter);

    if ($("#userName").attr("value").length == 0)
        $("#userName").focus();
    else
        $("#userPass").focus();
    
    $("#signInNotification").showNotification(lastError, "Error");
};

function showHomePage(sender) {
    if ($("#rootContainer").dataContext() != null && sender != null) {
        $("#content").empty();

        if ($.browser.mobile)
            $(".programUnits").hide();

        return;
    }

    app.currentPath = '';

    $("#rootContainer").html($($.browser.mobile ? "#home_mobile_template" : "#home_template").html());
    $("#rootContainer").dataContext(app);

    $(".programUnits").show();

    if ($.browser.mobile) {
        $("#home").button();
        $("#home").on("click", function () {
            app.navigate("");
            $("#rootContainer").dataContext(null);
            app.programUnits.selectedItem(null);
            app.programUnits.selectedItem(app.programUnits.firstOrDefault());
        });
    }

    if (app.globalSearchId != "00000000-0000-0000-0000-000000000000") {
        var globalSearchInput = $("#globalSearch");
        globalSearchInput.val(app.getTranslatedMessage("GlobalSearch"));
        globalSearchInput.on("focus", function () {
            $(this).val("");
        });
        globalSearchInput.on("blur", function () {
            $(this).val(app.getTranslatedMessage("GlobalSearch"));
        });
        if (globalSearchInput.length != 0) {
            globalSearchInput.on("keypress", function (e) {
                if ((e.keyCode || e.which) == 13) {
                    app.invokeGlobalSearch(globalSearchInput.val());
                    globalSearchInput.blur();
                    e.stopPropagation();
                    e.preventDefault();
                }
            });
        }

        $("#globalSearch").show();
    }
    else
        $("#globalSearch").hide();

    var signInOutButton = $("#signInOut");
    var usingDefaultUser = app.isUsingDefaultUser();
    var text = usingDefaultUser ? app.getTranslatedMessage("SignIn") : app.getTranslatedMessage("SignOut");

    if ($.browser.mobile) {
        var signInOutButtonSpan = $("#signInOut").find(".ui-button-text");
        if (signInOutButtonSpan.length != 0) {
            signInOutButtonSpan.text(text);
        } else {
            signInOutButton.addClass("noDropDown").text(text)
                .click(function () {
                    app.signOut(usingDefaultUser);
                });
        }
    }
    else {
        if (!usingDefaultUser) {
            signInOutButton.removeClass("noDropDown").text(app.friendlyUserName);
            var ul = $("<ul>");
            if (app.userSettingsId != null && app.userSettingsId != "00000000-0000-0000-0000-000000000000") {
                var userSettingsLi = $("<li>").text(app.getTranslatedMessage("UserSettings")).click(function () {
                    app.navigate("PersistentObject." + app.userSettingsId + "/" + app.userId);
                });
                ul.append(userSettingsLi);
            }

            //// FEEDBACK
            if (app.feedbackId != null && app.feedbackId != "00000000-0000-0000-0000-000000000000") {
                var feedbackLi = $("<li>").text(app.getTranslatedMessage("Feedback")).click(function () {
                    var loadPo = function (base64Img) {
                        app.gateway.getPersistentObject(null, app.feedbackId, null, function (result) {
                            if (!isNullOrEmpty(result.notification)) {
                                app.showException(result.notification);
                                return;
                            }
                            
                            var ssAttr = result.getAttribute("Screenshot");
                            ssAttr.setValue(base64Img.toDataURL().replace("data:image/png;base64,", ""));
                            ssAttr.typeHints["Width"] = "100%";
                            ssAttr.typeHints["Height"] = base64Img.height + "px";
                            
                            app.openPersistentObject(result, true);
                        });
                    };

                    var canvas = document.createElement("canvas");
                    var ctx = (canvas.getContext === undefined) ? false : canvas.getContext("2d");
                    if (ctx !== false)
                        $('body').html2canvas({ onrendered: function (e) { loadPo(e); } });
                });
                ul.append(feedbackLi);
            }
            /////////////

            var signOutLi = $("<li>").text(text).click(function () {
                app.signOut(usingDefaultUser);
            });
            ul.append(signOutLi);
            signInOutButton.subMenu(ul);
        }
        else {
            signInOutButton.text(text).addClass("noDropDown").click(function () {
                app.signOut(usingDefaultUser);
            });
        }
    }
    $.setVisibilityForState("SignedIn", true);

    if (sender == null || !$.browser.mobile) {
        if ($.browser.mobile)
            $(".programUnits").show();

        var programUnits = $(".programUnits").empty();
        var ul = $("<ul>").addClass("list");
        programUnits.append(ul);

        if (!$.browser.mobile)
            programUnits.overflow($("<li class='programUnit'><span>...</span></li>"), "programUnitsOverflow");

        programUnits.show();

        app.programUnits.run(function (item) {
            var il = item.createElement();
            ul.append(il);

            if (app.programUnits.selectedItem() == item) {
                item.open();
                il.addClass("selectedProgramUnit");
            }
        });
    }

    if (app.programUnits.selectedItem() == null)
        app.programUnits.selectFirst();
}

function showQueryPage(id, filterName) {
    showHomePage("showQueryPage");

    app.returnUrl(null);

    var path = hasher.getHash();
    if (app.currentPath == path)
        return;

    app.currentPath = path;
    app.selectQueryProgramUnitItem(id);

    var query = app.pageObjects[path];
    if (query == null) {
        app.gateway.getQuery(id, filterName, function (q) {
            app.pageObjects[path] = q;
            app.currentPage = q;
            q.open();
            app.setTitle(q.label);
        });
    }
    else {
        app.currentPage = query;
        query.open();
        app.setTitle(query.label);
    }
}

function showPersistentObject(id, objectId) {
    showHomePage("showPersistentObject");

    app.returnUrl(null);

    var path = hasher.getHash();
    if (app.currentPath == path)
        return;

    app.currentPath = path;
    app.selectPersistentObjectProgramUnitItem(id, objectId);

    var po = app.pageObjects[path];
    if (po == null) {
        app.gateway.getPersistentObject(null, id, objectId, function (loadedPo) {
            app.pageObjects[path] = loadedPo;
            loadedPo.getPath = function () { return path; };
            app.currentPage = loadedPo;
            loadedPo.open();
            app.setTitle(loadedPo.breadcrumb);
        });
    }
    else {
        app.currentPage = po;
        po.open();
        app.setTitle(po.breadcrumb);
    }
}

function showPersistentObjectFromAction(rnd) {
    showHomePage("showPersistentObjectFromAction");

    app.resetSelectedProgramUnitItem();

    app.returnUrl(null);

    var path = "PersistentObjectFromAction/" + rnd;
    if (app.currentPath == path)
        return;

    app.currentPath = path;

    var po = app.pageObjects[path];
    if (po == null) {
        var content = $("#content");
        var notificationBox = $("<div>").addClass("notification notification-Error").css({ margin: "12px" });
        notificationBox.text(app.getTranslatedMessage("UnableToLoadObject"));

        content.empty();
        content.append(notificationBox);

        return;
    }

    app.currentPage = po;
    po.open();
    app.setTitle(po.breadcrumb);
}

function showProgramUnit(id) {
    showHomePage();

    $("#content").empty();

    app.resetSelectedProgramUnitItem();

    app.returnUrl(null);

    var path = hasher.getHash();
    if (app.currentPath == path)
        return;

    app.currentPath = path;

    var programUnit = app.pageObjects[path];

    if (programUnit == null) {
        programUnit = app.programUnits.firstOrDefault(function (pu) { return pu.item.id == id; });
        app.pageObjects[path] = programUnit;
        app.programUnits.selectedItem(programUnit);
    }

    app.currentPage = programUnit;
    programUnit.openTemplate();
    app.setTitle(programUnit.title);
}