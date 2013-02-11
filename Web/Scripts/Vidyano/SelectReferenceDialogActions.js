/// <reference path="/Scripts/jquery-1.9.1.min.js" />
/// <reference path="Common.js" />
/// <reference path="ExpressionParser.js" />
/// <reference path="Application.js" />
/// <reference path="jQuery.js" />
/// <reference path="ServiceGateway.js" />
/// <reference path="PersistentObject.js" />
/// <reference path="PersistentObjectAttribute.js" />
/// <reference path="Query.js" />
/// <reference path="QueryResultItem.js" />
/// <reference path="Controls/QueryGrid.js" />
/// <reference path="Controls/QueryViewer.js" />
/// <reference path="ActionBase.js" />

function SelectReferenceDialogActions(query, maxSelectedItems, onValueSelected, onDialogClosed) {
    var selectReferenceDialogActions = this;
    var selectAction;
    var dialog;
    var pagingContainer;
    var lastFocusedItem;

    this.maxSelectedItems = maxSelectedItems;

    selectAction = Actions.getAction("DialogOk", query);
    selectAction.dialogParent = this;

    var dialogCancel = Actions.getAction("DialogCancel", query);
    dialogCancel.dialogParent = this;

    query.actions = [selectAction, dialogCancel];

    this.showDialog = function (useCurrentItems) {
        /// <summary>Shows the dialog used to select a reference value. </summary>
        /// <param name="useCurrentItems" type="Boolean">When true is passed to this paramater, the query will not be searched again, but use the items it already has retreived.</param>
        lastFocusedItem = $("*:focus");

        query.textSearch = "";
        query.maxSelectedItems = this.maxSelectedItems;

        var mainContainer = $.createElement('div').addClass('dialog-content');
        mainContainer.append($($.mobile ? "#browseReferenceQuery_mobile_template" : "#browseReferenceQuery_template").html());

        if (!$.mobile)
            methods.initializeDialog(mainContainer, query);
        else
            methods.initializeDialogMobile(mainContainer, query);

        var queryDiv = mainContainer.find("#browseReferenceQuery");
        query.target = queryDiv;
        queryDiv.queryViewer(query);
        query.spinnerTarget = queryDiv.parents(".dialog-content");

        query.onItemClicked = function (selectedItem) {
            onValueSelected([selectedItem]);
            selectReferenceDialogActions.closeDialog();
        };

        if (!useCurrentItems) {
            query.columns.forEach(function (column) { column.includes = []; });

            query.search(methods.onQuerySearchCompleted, function (e) {
                query.parent.showNotification(e, "Error");

                dialog.remove();
                mainContainer.remove();
            });
        }
        else
            methods.onQuerySearchCompleted(query);
    };

    this.selectItems = function (e) {
        /// <summary>Selects the items supplied, by calling the onValueSelected funtion supplied in the Constructor. The dialog will also be closed.</summary>
        /// <param name="e" type="Array" elementType="QueryResultItem">The value to select.</param>
        onValueSelected(e);
        this.closeDialog();
    };

    this.closeDialog = function () {
        /// <summary>Closes the dialog and removes all dialog elements from the DOM. This will also restore the focus on the item that had the focus before the dialog opened.</summary>

        if (typeof (onDialogClosed) == "function")
            onDialogClosed();

        dialog.remove();
        $("#rootContainer").show();

        lastFocusedItem.focus();
    };

    var methods = {
        onQuerySearchCompleted: function () {
            var buttonContainer = $('.ui-dialog-buttonpane');
            var normalActionsDiv = buttonContainer.find(".normalActions");

            normalActionsDiv.empty();
            query.actions.run(function (a) {
                normalActionsDiv.append(a.render());
            });
        },

        initializeDialogMobile: function (container) {
            dialog = container;

            container.find("#browseReferenceObjectTitle").text(!isNullOrWhiteSpace(query.label) ? query.label : query.name);

            var buttonContainer = container.find('#browseReferenceActions');
            buttonContainer.addClass("ui-dialog-buttonpane");

            //append actions toolbar to the button container
            buttonContainer.append($.createElement("ul").addClass("normalActions"));
            buttonContainer.append($.createElement("ul").addClass("pinnedActions"));

            container.dataContext(query);
            $("body").append(container);
            var search = container.find("#browseReferenceSearch");

            search.createSearch(query, methods.onQuerySearchCompleted);
            $("#rootContainer").hide();
        },

        initializeDialog: function (container) {
            dialog = container.dialog({
                draggable: !$.mobile,
                width: $(window).width() * ($.mobile ? 1.0 : 0.75),
                height: $(window).height() * ($.mobile ? 1.0 : 0.75),
                modal: true,
                close: function () {
                    

                    dialog.remove();
                    container.remove();
                },
                autoOpen: false,
                //default button is needed to spawn the button area at the bottom of the dialog
                buttons: [
                {
                    text: app.getTranslatedMessage("Cancel"),
                    click: function () {
                        $(this).dialog("close");
                    }
                }],
                title: !isNullOrWhiteSpace(query.label) ? query.label : query.name
            });

            $(".ui-dialog").bind("keydown", function (e) {
                if (e.keyCode == 27) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            //hide default close button at the top of the dialog before showing
            var buttonBar = $(".ui-dialog-titlebar-close");
            buttonBar.remove();

            //remove the cancel button at the bottom of the dialog before showing
            var buttonContainer = $('.ui-dialog-buttonpane');
            buttonContainer.empty();

            //append actions toolbar to the button container
            buttonContainer.append($.createElement("ul").addClass("normalActions"));
            buttonContainer.append($.createElement("ul").addClass("pinnedActions"));
            pagingContainer = $.createElement("ul");

            container.dialog("open");
            container.dataContext(query);
            var search = $.createElement('div').addClass("browseReferenceSearch");
            $('.ui-dialog-titlebar').append(search);

            $(".dialog-content").addClass("browseReferenceDialogContent");
            $(".ui-dialog-title").addClass("browseReferenceDialogTitle");

            search.createSearch(query, methods.onQuerySearchCompleted, true);

            // NOTE: this code prevents the dialog from dragging when the search box is clicked
            search.on('mousedown', function (e) {
                e.stopPropagation();
                //e.preventDefault();
            });
        }
    };
}