function signInPage() {
    app.setAuthToken(null);
    app.currentPath = "SignIn";

    $.setVisibilityForState("SignedIn", false);

    var lastError = app.lastError;
    app.dispose();

    if (app.clientData.providers && Object.keys(app.clientData.providers).length == 1 && app.clientData.providers.Acs) {
        app.oAuthSignIn("Acs");
        return;
    }

    $("#rootContainer").html($("#signin_template").html());
    
    $.unhookElements();

    var $userName = $("#userName");
    var $userPass = $("#userPass");
    var $staySignedIn = $("#staySignedIn");
    var $signIn = $("#signIn").button();

    if (app.clientData.exception == null) {
        var languages = app.clientData.languages;
        for (var lang in languages) {
            var language = languages[lang];
            if (language.isDefault) {
                $signIn.find("span").text(language.messages["SignIn"]);
                $("label[for=userName]").text(language.messages["UserName"]);
                $("label[for=userPass]").text(language.messages["Password"]);
                $("label[for=staySignedIn]").text(language.messages["StaySignedIn"]);
                $("#signInBoxApplicationTitle").text(language.messages["SignInUsing"]);
                break;
            }
        }
    }
    else
        lastError = app.clientData.exception;

    var signIn = function () {
        var $signInSpinner = $("#signInSpinner");
        $signInSpinner.spin(app.settings.defaultSpinnerOptions);

        $userName.attr("disabled", "disabled");
        $userPass.attr("disabled", "disabled");
        $staySignedIn.attr("disabled", "disabled");

        $signIn.button("disable");

        var userName = $userName.val();
        app.staySignedIn = $staySignedIn.prop("checked");

        app.gateway.getApplication(userName, $userPass.val(), function () {
            app.lastError = null;

            if (app.staySignedIn) {
                var exp = new Date();
                exp.setFullYear(exp.getFullYear() + 1);
                $.cookie("userName", userName, { expires: exp });
                $.cookie("staySignedIn", "true", { expires: exp, force: true }); // NOTE: Is used by server
            }
            else {
                $.cookie("userName", userName);
                $.cookie("staySignedIn", null);
            }

            $("#content").empty();
            $signInSpinner.spin(false);

            $.setVisibilityForState("SignedIn", true);

            var returnUrl = app.returnUrl();
            app.returnUrl(null);

            if ($("#rootContainer").dataContext() == null) {
                $("#signInBox").off("resize.centerSignInBox");
                $("#rootContainer").off("resize.centerSignInBox");
                showHomePage();
            }

            if (!isNullOrWhiteSpace(returnUrl))
                app.navigate(returnUrl, true);
            else if ($.mobile)
                app.navigate("");
        }, function (e) {
            $signInSpinner.spin(false);

            $("#signInNotification").showNotification(e, "Error");

            $userName.removeAttr('disabled');
            $userPass.removeAttr('disabled');
            $staySignedIn.removeAttr('disabled');
            $signIn.button("enable");
        });
    };

    var signInOnEnter = function (e) {
        if ((e.keyCode || e.which) == 13) {
            signIn();
            e.stopPropagation();
            e.preventDefault();
        }
    };

    $userName.val($.cookie("userName"));
    $staySignedIn.prop("checked", app.staySignedIn);

    $signIn.click(signIn);

    $userName.on("keypress", signInOnEnter);
    $userPass.on("keypress", signInOnEnter);

    if ($userName.val().length == 0)
        $userName.focus();
    else
        $userPass.focus();

    var centerSignInBox = function () {
        var rootContainer = $("#rootContainer");
        var signInBox = $("#signInBox");

        signInBox.css({
            "left": Math.round(rootContainer.innerWidth() / 2 - signInBox.outerWidth() / 2) + "px",
            "top": Math.max(0, Math.round(rootContainer.innerHeight() / 2 - signInBox.outerHeight() / 2)) + "px"
        });
    };

    $("#signInBox").on("resize.centerSignInBox", centerSignInBox);
    $("#rootContainer").on("resize.centerSignInBox", centerSignInBox);

    var hasVidyano = false;
    var hasOAuth = false;
    var oAuthProviders = $("#oAuthProviders");
    for (var p in app.clientData.providers) {
        if (p == "Vidyano") {
            hasVidyano = true;
            $("#vidyanoProvider").show();
        }
        else {
            hasOAuth = true;
            var provider = $.createElement("div", p).addClass("provider " + p).text(app.clientData.providers[p].parameters["label"]).button().on("click", function () {
                app.oAuthSignIn($(this).dataContext());
            });
            oAuthProviders.append(provider);
        }
    }

    if (hasOAuth) {
        oAuthProviders.show();
        if (hasVidyano)
            $("#mixedSignInMode").show();
    }

    centerSignInBox();

    if (lastError != null) {
        $("#signInBoxApplicationTitle").text(language == null ? "Error" : language.messages["Error"]);
        $("#signInNotification").showNotification(lastError, "Error");
    }
};

function showHomePage(sender) {
    var $rootContainer = $("#rootContainer");
    if ($rootContainer.dataContext() != null && sender != null) {
        $("#content").empty();

        if ($.mobile)
            $(".programUnits").hide();

        return;
    }

    app.currentPath = '';

    $rootContainer.html($($.mobile ? "#home_mobile_template" : "#home_template").html());
    $rootContainer.dataContext(app);

    $.unhookElements();

    $(".programUnits").show();

    if ($.mobile) {
        $("#home").button();
        $("#home").on("click", function () {
            app.navigate("");
            $rootContainer.dataContext(null);
            app.programUnits.selectedItem(null);
            app.programUnits.selectedItem(app.programUnits.firstOrDefault());
        });
    }
    else {
        if (app.canProfile) {
            var profilerButton = $rootContainer.find(".profilerButton");
            profilerButton.profiler("enable");

            profilerButton.on("click", function () {
                app.isProfiling = !app.isProfiling;
                $rootContainer.profiler(app.isProfiling ? "start" : "stop");
                $.cookie("profiling", app.isProfiling ? "True" : "False");
            });

            if ($.cookie("profiling") == "True") {
                app.isProfiling = true;
                $rootContainer.profiler("start");
            }
        }
    }

    if (app.globalSearchId != "00000000-0000-0000-0000-000000000000") {
        var globalSearchInput = $("#globalSearch");
        globalSearchInput.attr("placeholder", app.getTranslatedMessage("GlobalSearch"));
        if (globalSearchInput.length != 0) {
            globalSearchInput.on("keypress", function (e) {
                if ((e.keyCode || e.which) == 13) {
                    app.invokeGlobalSearch(globalSearchInput.val());
                    globalSearchInput.val("");
                    globalSearchInput.blur();
                    e.stopPropagation();
                    e.preventDefault();
                }
            });
        }

        $("#globalSearchButton").off("click");
        $("#globalSearchButton").on("click", function () {
            var val = globalSearchInput.val();
            if (!isNullOrWhiteSpace(val)) {
                app.invokeGlobalSearch(val);
                globalSearchInput.val("");
            }
            else
                globalSearchInput.focus();
        });

        $("#globalSearch").show();
    }
    else
        $("#globalSearchContainer").hide();

    var signInOutButton = $("#signInOut");
    var usingDefaultUser = app.isUsingDefaultUser();
    var text = usingDefaultUser ? app.getTranslatedMessage("SignIn") : app.getTranslatedMessage("SignOut");

    if ($.mobile) {
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
                var userSettingsLi = $("<li>").text(app.getTranslatedMessage("UserSettings")).on("click", function () {
                    app.navigate("PersistentObject." + app.userSettingsId + "/" + app.userId);
                });
                ul.append(userSettingsLi);
            }

            //// FEEDBACK
            if (app.feedbackId != null && app.feedbackId != "00000000-0000-0000-0000-000000000000") {
                var feedbackLi = $("<li>").text(app.getTranslatedMessage("Feedback")).on("click", function () {
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

            var signOutLi = $("<li>").text(text).on("click", function () {
                app.signOut(usingDefaultUser);
            });
            ul.append(signOutLi);
            signInOutButton.subMenu(ul, { minWidth: true, openOnHover: true });
        }
        else {
            signInOutButton.text(text).addClass("noDropDown").click(function () {
                app.signOut(usingDefaultUser);
            });
        }
    }
    $.setVisibilityForState("SignedIn", true);

    if (sender == null || !$.mobile) {
        var programUnits = $(".programUnits");
        var ul = programUnits.find(".list");
        if (ul.length == 0) {
            ul = $("<ul>").addClass("list");
            programUnits.append(ul);
        }

        if ($.mobile)
            programUnits.show();
        else{
            if (app.programUnits.length > 1) {
                ul.show();
                programUnits.subMenu(ul, { minWidth: true, openOnHover: true });
            }
            else {
                ul.hide();
                $(".activeProgramUnit").addClass("singleProgramUnit");
            }

            if (!isNullOrEmpty(app.icon)) {
                var logo = $(".logo");
                logo.attr("src", app.icon);
                logo.css("display", "inline-block");
            }
        }

        programUnits.show();

        app.programUnits.forEach(function (item) {
            var il = item.createElement();
            ul.append(il);

            if (app.programUnits.selectedItem() == item) {
                item.open();
                $(".activeProgramUnit").text(item.title);
                il.addClass("selectedProgramUnit");
            }
        });
    }

    if (app.programUnits.selectedItem() == null) {
        if (app._programUnitName != null) {
            app.programUnits.selectedItem(app.programUnits.firstOrDefault(function (pu) { return pu.name == app._programUnitName; }));
            app._programUnitName = null;
        }

        if (app.programUnits.selectedItem() == null && app.userSettings.defaultProgramUnit != null)
            app.programUnits.selectedItem(app.programUnits.firstOrDefault(function (pu) { return pu.name == app.userSettings.defaultProgramUnit; }));

        if (app.programUnits.selectedItem() == null)
            app.programUnits.selectFirst();

        if (app.programUnits.selectedItem() != null)
            app.programUnits.selectedItem().open();
    }
}

function showQueryPage(id, filterName) {
    var showPage = function() {
        showHomePage("showQueryPage");

        app.returnUrl(null);

        var path = hasher.getHash();
        if (app.currentPath == path)
            return;

        app.currentPath = path;
        app.selectQueryProgramUnitItem(id);

        var query = app.pageObjects[path];
        if (query == null) {
            app.gateway.getQuery(id, filterName, function(q) {
                app.pageObjects[path] = q;
                app.currentPage = q;
                q.open();
                app.setTitle(q.label);
            });
        } else {
            app.currentPage = query;
            query.open();
            app.setTitle(query.label);
        }
    };
    Pages.checkUnsavedChanges(showPage);
}

function showPersistentObject(id, objectId) {
    var showPage = function () {
        showHomePage("showPersistentObject");

        app.returnUrl(null);

        var path = hasher.getHash();
        if (app.currentPath == path)
            return;

        app.currentPath = path;
        app.selectPersistentObjectProgramUnitItem(id, objectId);

        var po = app.pageObjects[path];
        if (po == null) {
            app.gateway.getPersistentObject(null, id, objectId, function(loadedPo) {
                app.pageObjects[path] = loadedPo;
                loadedPo.getPath = function() { return path; };
                app.currentPage = loadedPo;
                loadedPo.open();
                app.setTitle(loadedPo.breadcrumb);
            });
        } else {
            app.currentPage = po;
            po.open();
            app.setTitle(po.breadcrumb);
        }
    };
    Pages.checkUnsavedChanges(showPage);
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

        $.unhookElements();

        return;
    }

    app.currentPage = po;
    po.open();
    app.setTitle(po.breadcrumb);
}

function showProgramUnit(id) {
    var showPage = function () {
        var path = hasher.getHash();
        if (app.currentPath != "" && app.currentPath != "SignIn") {
            showHomePage(app.isMobile ? null : "showProgramUnit");

            $("#content").empty();

            $.unhookElements();

            app.resetSelectedProgramUnitItem();
            app.returnUrl(null);

            if (app.currentPath == path)
                return;
        }

        app.currentPath = path;

        var programUnit = app.pageObjects[path];
        if (programUnit == null) {
            programUnit = app.programUnits.firstOrDefault(function (pu) { return pu.item.id == id; });
            if (programUnit != null)
                app.pageObjects[path] = programUnit;
            app.programUnits.selectedItem(programUnit);
        }

        if (programUnit == null) {
            return;
        }

        app.currentPage = programUnit;
        programUnit.openTemplate();
        app.setTitle(programUnit.title);
    };
    Pages.checkUnsavedChanges(showPage);
}

function Pages() { };
Pages.checkUnsavedChanges = function (onContinue) {
    var target = hasher.getHash();
    if (!app.unsavedChangesConfirmed && !app.isNavigating && app.hasUnsavedChanges(target)) {
        var d = $.createElement("div");
        d.html(app.getTranslatedMessage("ConfirmLeavePage"));

        var buttons = {};
        buttons[app.getTranslatedMessage("StayOnThisPage")] = function () {
            $(this).dialog("close");
            d.remove();
            
            app.unsavedChangesConfirmed = true;
            var oldPath = app.currentPath;
            app.currentPath = "";
            hasher.setHash(oldPath);
            app.unsavedChangesConfirmed = false;
        };

        buttons[app.getTranslatedMessage("LeaveThisPage")] = function () {
            $(this).dialog("close");
            d.remove();
            app.removeUnsavedChanges();
            
            onContinue();
        };

        d.dialog({
            title: app.getTranslatedMessage("PagesWithUnsavedChanges"),
            resizable: false,
            open: function () { $(".ui-dialog-titlebar-close").hide(); },
            modal: true,
            width: 400,
            buttons: buttons
        });
    }
    else
        onContinue();
};