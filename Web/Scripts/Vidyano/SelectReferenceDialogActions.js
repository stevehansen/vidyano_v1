/// <reference path="/Scripts/jquery-2.0.0.min.js" />
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
    this.maxSelectedItems = maxSelectedItems;
    this.onValueSelected = onValueSelected;
    this.onDialogClosed = onDialogClosed;

    this._dialog = null;
    this._lastFocusedItem = null;

    this._selectAction = Actions.getAction("DialogOk", query);
    this._selectAction.dialogParent = this;

    this._dialogCancel = Actions.getAction("DialogCancel", query);
    this._dialogCancel.dialogParent = this;

    query.actions = [this._selectAction, this._dialogCancel];
    query.options.hideSemanticZoom = true;

    this.query = query;
}

SelectReferenceDialogActions.prototype.showDialog = function (useCurrentItems) {
    /// <summary>Shows the dialog used to select a reference value. </summary>
    /// <param name="useCurrentItems" type="Boolean">When true is passed to this paramater, the query will not be searched again, but use the items it already has retreived.</param>

    this._lastFocusedItem = $("*:focus");

    this.query.textSearch = "";
    this.query.maxSelectedItems = this.maxSelectedItems;

    var mainContainer = $.createElement('div').addClass('dialog-content');
    mainContainer.append($($.mobile ? "#browseReferenceQuery_mobile_template" : "#browseReferenceQuery_template").html());

    if (!$.mobile)
        this._initializeDialog(mainContainer);
    else
        this._initializeDialogMobile(mainContainer);

    var queryDiv = mainContainer.find("#browseReferenceQuery");
    this.query.container = queryDiv;
    queryDiv.queryViewer(this.query);
    this.query.spinnerTarget = queryDiv.parents(".dialog-content");

    var _this = this;
    this.query.onItemClicked = function (selectedItem) {
        _this.selectItems([selectedItem]);
    };

    if (!useCurrentItems) {
        this.query.columns.forEach(function (column) { column.includes = []; });
        this.query.search(this._onQuerySearchCompleted.bind(this), this._onQuerySearchError.bind(this));
    }
    else
        this._onQuerySearchCompleted();
};

SelectReferenceDialogActions.prototype.selectItems = function (e) {
    /// <summary>Selects the items supplied, by calling the onValueSelected funtion supplied in the Constructor. The dialog will also be closed.</summary>
    /// <param name="e" type="Array" elementType="QueryResultItem">The value to select.</param>

    this.onValueSelected(e);
    this.closeDialog();
};

SelectReferenceDialogActions.prototype.closeDialog = function () {
    /// <summary>Closes the dialog and removes all dialog elements from the DOM. This will also restore the focus on the item that had the focus before the dialog opened.</summary>

    var dialog = this._dialog;
    if (dialog) {
        this._dialog = null;

        if (typeof (this.onDialogClosed) == "function")
            this.onDialogClosed();

        dialog.dataContext(null);
        if (!$.mobile)
            dialog.dialog("close");
        dialog.remove();

        $("#rootContainer").show();

        if (this._lastFocusedItem) {
            this._lastFocusedItem.focus();
            this._lastFocusedItem = null;
        }

        if (this.query) {
            $._unhookQuery(this.query);
            this.query.onItemClicked = null;
            this.query = null;
        }
    }
};

SelectReferenceDialogActions.prototype._onQuerySearchCompleted = function () {
    var buttonContainer = $('.ui-dialog-buttonpane');
    var normalActionsDiv = buttonContainer.find(".normalActions").empty();
    var pinnedActionsDiv = buttonContainer.find(".pinnedActions").empty();

    this.query.actions.forEach(function (a) {
        if (a.isPinned)
            pinnedActionsDiv.append(a.render());
        else
            normalActionsDiv.append(a.render());
    });
};

SelectReferenceDialogActions.prototype._onQuerySearchError = function (e) {
    var poToShowError = this.query.parent;
    if (this.query.parent.ownerDetailAttribute != null)
        poToShowError = this.query.parent.ownerDetailAttribute.parent;
    poToShowError.showNotification(e, "Error");

    this.closeDialog();
};

SelectReferenceDialogActions.prototype._initializeDialogMobile = function (container) {
    this._dialog = container;

    container.find("#browseReferenceObjectTitle").text(!isNullOrWhiteSpace(this.query.label) ? this.query.label : this.query.name);

    var buttonContainer = container.find('#browseReferenceActions');
    buttonContainer.addClass("ui-dialog-buttonpane");

    //append actions toolbar to the button container
    buttonContainer.append($.createElement("ul").addClass("normalActions"), $.createElement("ul").addClass("pinnedActions"));

    container.dataContext(this.query);
    $("body").append(container);
    var search = container.find("#browseReferenceSearch");

    search.createSearch(this.query, this._onQuerySearchCompleted.bind(this));
    $("#rootContainer").hide();
};

SelectReferenceDialogActions.prototype._initializeDialog = function (container) {
    this._dialog = container.dialog({
        draggable: false,
        resizable: false,
        width: $(window).width() * ($.mobile ? 1.0 : 0.75),
        height: $(window).height() * ($.mobile ? 1.0 : 0.75),
        modal: true,
        close: this.closeDialog.bind(this),
        autoOpen: false,
        //default button is needed to spawn the button area at the bottom of the dialog
        buttons: [
            {
                text: app.getTranslatedMessage("Cancel"),
                click: function () {
                    $(this).dialog("close");
                }
            }],
        title: !isNullOrWhiteSpace(this.query.label) ? this.query.label : this.query.name
    });

    $(".ui-dialog").on("keydown", function (e) {
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
    buttonContainer.append($.createElement("ul").addClass("normalActions"), $.createElement("ul").addClass("pinnedActions"));

    container.dialog("open");
    container.dataContext(this.query);
    var search = $.createElement('div').addClass("browseReferenceSearch");
    $('.ui-dialog-titlebar').append(search);

    $(".dialog-content").addClass("browseReferenceDialogContent");
    $(".ui-dialog-title").addClass("browseReferenceDialogTitle");

    search.createSearch(this.query, this._onQuerySearchCompleted.bind(this), true);

    // NOTE: this code prevents the dialog from dragging when the search box is clicked
    search.on('mousedown', function (e) {
        e.stopPropagation();
        //e.preventDefault();
    });
};