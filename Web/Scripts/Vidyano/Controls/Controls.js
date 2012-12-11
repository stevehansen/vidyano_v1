(function ($) {
    $.fn.vidyanoDateEdit = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var date = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            var datePicker = root.find(".persistentObjectAttributeEditDateInput").vidyanoDatePicker(date, {
                onDateSelected: function (selectedDate) {
                    if (attribute.type == "Date" && selectedDate == null) {
                        datePicker.setDate(ServiceGateway.fromServiceString(attribute.value, attribute.type));
                    }
                    else {
                        attribute.setValue(selectedDate);

                        if (selectedDate == null)
                            clearButton.hide();
                        else
                            clearButton.show();
                    }
                }
            });

            var clearButton = root.find(".clearButton");
            clearButton.button().on("click", function () { datePicker.clear(); });
            if (attribute.value == null)
                clearButton.hide();
        });
    };

    $.fn.vidyanoTimeEdit = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var value = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            if (value != null) {
                // Strip just hours/minutes
                var parts = value.split('.');
                if (parts.length > 1)
                    value = parts[0] || '';

                parts = value.split(':');
                if (parts.length == 3)
                    value = parts[0] + ':' + parts[1];
                else if (parts.length == 4)
                    value = parts[1] + ':' + parts[2];
            }

            var timePicker = $(".persistentObjectAttributeEditTime", root).vidyanoTimePicker(value, {
                onTimeSelected: function (selectedTime) {
                    if (attribute.type == "Time" && selectedTime == null) {
                        timePicker.setTime(ServiceGateway.fromServiceString(selectedTime, attribute.type));
                    }
                    else {
                        attribute.setValue(selectedTime);

                        if (selectedTime == null)
                            clearButton.hide();
                        else
                            clearButton.show();
                    }
                }
            });

            var clearButton = root.find(".clearButton");
            clearButton.button().on("click", function () { timePicker.clear(); });
            if (value == null)
                clearButton.hide();
        });
    };

    $.fn.vidyanoDateTimeEdit = function () {
        $(this).each(function () {
            var root = $(this);
            var isClearing = false;
            var attribute = root.dataContext();

            function updateDateTime() {
                if (isClearing)
                    return;

                var now = new Date();

                if (isNullOrWhiteSpace(selectedDate) && !isNullOrWhiteSpace(selectedTime))
                    datePicker.setDate(now);
                else if (!isNullOrWhiteSpace(selectedDate) && isNullOrWhiteSpace(selectedTime))
                    timePicker.setTime(now.format("HH:mm"));
                else if (!isNullOrWhiteSpace(selectedDate) && !isNullOrWhiteSpace(selectedTime))
                    attribute.setValue(selectedDate + " " + selectedTime);

                clearButton.show();
            }

            var dateTime = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            var selectedDate = dateTime != null ? dateTime.format("MM/dd/yyyy") : null;
            var selectedTime = dateTime != null ? dateTime.format("HH:mm") : null;
            var datePicker = $(".persistentObjectAttributeEditDateInput", root).vidyanoDatePicker(selectedDate, {
                onDateSelected: function (value) {
                    selectedDate = value.format("MM/dd/yyyy");
                    updateDateTime();
                }
            });
            var timePicker = $("select.persistentObjectAttributeEditTime", root).vidyanoTimePicker(selectedTime, {
                onTimeSelected: function (value) {
                    selectedTime = value;
                    updateDateTime();
                }
            });

            var clearButton = root.find(".clearButton");
            clearButton.button().on("click", function () {
                isClearing = true;

                datePicker.clear();
                timePicker.clear();
                attribute.setValue(null);

                clearButton.hide();

                isClearing = false;
            });
            if (attribute.value == null)
                clearButton.hide();
        });
    };

    $.fn.vidyanoDateTimeOffset = function () {
        $(this).each(function () {
            var root = $(this);
            var isClearing = false;
            var attribute = root.dataContext();

            function updateDateTime() {
                if (isClearing)
                    return;

                var now = new Date();

                if (isNullOrWhiteSpace(selectedOffset))
                    offsetPicker.setOffset("+00:00");

                if (isNullOrWhiteSpace(selectedDate) && !isNullOrWhiteSpace(selectedTime))
                    datePicker.setDate(now);
                else if (!isNullOrWhiteSpace(selectedDate) && isNullOrWhiteSpace(selectedTime))
                    timePicker.setTime(now.format("HH:mm"));
                else if (!isNullOrWhiteSpace(selectedDate) && !isNullOrWhiteSpace(selectedTime))
                    attribute.onChanged({ value: selectedDate + " " + selectedTime + " " + selectedOffset }, true);

                clearButton.show();
            }

            var dateTime = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            var selectedDate = dateTime != null ? dateTime.format("MM/dd/yyyy") : null;
            var selectedTime = dateTime != null ? dateTime.format("HH:mm") : null;
            var selectedOffset = dateTime != null ? dateTime.netOffset() : null;
            var datePicker = $(".persistentObjectAttributeEditDateInput", root).vidyanoDatePicker(selectedDate, {
                onDateSelected: function (value) {
                    selectedDate = value.format("MM/dd/yyyy");
                    updateDateTime();
                }
            });
            var timePicker = $("select.persistentObjectAttributeEditTime", root).vidyanoTimePicker(selectedTime, {
                onTimeSelected: function (value) {
                    selectedTime = value;
                    updateDateTime();
                }
            });
            var offsetPicker = $(".persistentObjectAttributeEditOffset", root).vidyanoOffsetPicker(selectedOffset, {
                onOffsetSelected: function (value) {
                    selectedOffset = value;
                    updateDateTime();
                }
            });

            var clearButton = root.find(".clearButton");
            clearButton.button().on("click", function () {
                isClearing = true;

                datePicker.clear();
                timePicker.clear();
                offsetPicker.clear();
                attribute.setValue(null);

                clearButton.hide();

                isClearing = false;
            });
            if (attribute.value == null)
                clearButton.hide();
        });
    };

    $.fn.vidyanoNumeric = function () {
        $(this).each(function () {
            var root = $(this);
            var numericTextBox = root.find("input");
            var attribute = root.dataContext();
            var allowDecimal = attribute.type == "NullableDecimal" || attribute.type == "Decimal" || attribute.type == "NullableSingle" || attribute.type == "Single" || attribute.type == "NullableDouble" || attribute.type == "Double";
            var isNullable = attribute.type.startsWith("Nullable");
            var decimalSeperator = CultureInfo.currentCulture.numberFormat.numberDecimalSeparator;

            var eventFunctions = {
                onNumericTextBoxKeyPress: function (e) {
                    var keyCode = e.keyCode || e.which;
                    // Ignore backspace, tab, delete, arrows
                    if (keyCode == 8 || keyCode == 9 || keyCode == 46 || keyCode == 16 || keyCode == 17 || keyCode == 40 || keyCode == 39 || keyCode == 38 || keyCode == 37)
                        return;

                    var carretIndex = numericTextBox[0].selectionStart;
                    var value = numericTextBox.val();

                    if (keyCode < 48 || keyCode > 57) {
                        if ((keyCode == 44 || keyCode == 46 || keyCode == 110) && !value.contains(decimalSeperator) && allowDecimal) {
                            numericTextBox.val(value.insert(decimalSeperator, carretIndex));
                            functions.setCarretIndex(carretIndex + 1);
                        } else if (keyCode == 45 && !value.contains("-") && carretIndex == 0 && attribute.type != "Byte" && attribute.type != "NullableByte") {
                            numericTextBox.val(value.insert("-", carretIndex));
                            functions.setCarretIndex(carretIndex + 1);
                        }
                        e.preventDefault();
                    } else if (!functions.canParse(value.insert(String.fromCharCode(keyCode), carretIndex))) {
                        e.preventDefault();
                    }
                },

                onNumericTextBoxKeyUp: function () {
                    functions.triggerDataContextChanged(false);
                },

                onNumericTextBoxValueChange: function () {
                    functions.triggerDataContextChanged(true);
                }
            };
            var functions = {
                canParse: function (value) {
                    switch (attribute.type) {
                        case "Byte":
                        case "NullableByte":
                            return functions.between(parseInt(value, 10), 0, 255);
                        case "SByte":
                        case "NullableSByte":
                            return functions.between(parseInt(value, 10), -128, 127);
                        case "Int16":
                        case "NullableInt16":
                            return functions.between(parseInt(value, 10), -32768, 32767);
                        case "UInt16":
                        case "NullableUInt16":
                            return functions.between(parseInt(value, 10), 0, 65535);
                        case "Int32":
                        case "NullableInt32":
                            return functions.between(parseInt(value, 10), -2147483648, 2147483647);
                        case "UInt32":
                        case "NullableUInt32":
                            return functions.between(parseFloat(value), 0, 4294967295);
                        case "Int64":
                        case "NullableInt64":
                            return functions.between(parseFloat(value), -9223372036854775808, 9223372036854775807);
                        case "UInt64":
                        case "NullableUInt64":
                            return functions.between(parseFloat(value), 0, 18446744073709551615);
                        case "Decimal":
                        case "NullableDecimal":
                            return functions.between(parseFloat(value), -79228162514264337593543950335, 79228162514264337593543950335);
                        case "Single":
                        case "NullableSingle":
                            return functions.between(parseFloat(value), -3.40282347E+38, 3.40282347E+38);
                        case "Double":
                        case "NullableDouble":
                            return functions.between(parseFloat(value), -1.7976931348623157E+308, 1.7976931348623157E+308);
                        default:
                            return false;
                    }
                },

                between: function (value, minValue, maxValue) {
                    return !isNaN(value) && value >= minValue && value <= maxValue;
                },

                setCarretIndex: function (carretIndex) {
                    numericTextBox[0].selectionEnd = carretIndex;
                    numericTextBox[0].selectionStart = carretIndex;
                },

                triggerDataContextChanged: function (triggerRefresh) {
                    var value = numericTextBox.val();
                    if (value != "-")
                        attribute.onChanged({ value: isNullOrWhiteSpace(value) ? isNullable ? null : 0 : numericTextBox.val().replace(",", ".") }, triggerRefresh);
                }
            };

            numericTextBox.val(attribute.value)
                .on("keypress", eventFunctions.onNumericTextBoxKeyPress)
                .on("keyup", eventFunctions.onNumericTextBoxKeyUp)
                .on("change", eventFunctions.onNumericTextBoxValueChange);
        });
    };

    $.fn.vidyanoTranslatedString = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var isNew = attribute.parent.isNew;
            var options = attribute.options;
            var headers = $.parseJSON(options[2]);
            var contents = $.parseJSON(options[0]);
            var contentInput = root.find("input");
            var mainInput = root.find("input[type='text']");

            function triggerDataContextChanged(triggersRefresh) {
                if (!isNew) {
                    $("input", languagesContainer).each(function () {
                        contents[$(this).dataContext()] = $(this).val();
                    });

                    options[0] = JSON.stringify(contents);

                    attribute.isValueChanged = true;
                    attribute.parent.isDirty(true);
                }
                else
                    attribute.onChanged({ value: mainInput.val() }, triggersRefresh);
            }

            function onEditButtonClick() {
                if (languagesContainer.css("display") == "none") {
                    var firstInput = languagesContainer.find("input[type='text']").first();
                    languagesContainer.show("fast");
                    firstInput[0].selectionStart = firstInput.val().length;
                }
                else
                    languagesContainer.hide("fast");
            }

            function onInputChange() {
                triggerDataContextChanged(true);
            }

            function onInputKeyDown() {
                triggerDataContextChanged(false);
            }

            var languagesContainer = root.find(".persistentObjectAttributeEditLanguages");
            languagesContainer.hide();
            if (isNew) {
                root.find(".editButton").hide();
                mainInput
                    .on("keydown", onInputKeyDown)
                    .on("change", onInputChange);
            }
            else {
                mainInput.attr("readonly", "readonly");
                contentInput.on("click", onEditButtonClick);
                root.find(".editButton").button().on("click", onEditButtonClick);

                for (var prop in contents) {
                    var label = $(document.createElement("label"));
                    var input = $.createInput("text", prop);

                    label.text(headers[prop] + ":");
                    input.val(contents[prop])
                        .on("keydown", onInputKeyDown)
                        .on("change", onInputChange);
                    languagesContainer.append(label).append(input);
                }
            }
        });
    };

    $.fn.vidyanoFlagsEnum = function () {
        $(this).each(function () {
            var _enumValue;
            var _isUpdatingValues = false;

            var eventFunctions = {
                onCheckBoxChange: function () {
                    functions.toggleChecked($(this));
                },

                onCheckDivClick: function (e) {
                    var checkBox = $("input", $(this));

                    checkBox.attr("checked", !checkBox.attr("checked"));
                    functions.toggleChecked(checkBox);

                    e.stopPropagation();
                },

                onDocumentClick: function () {
                    $(".persistentObjectAttributeEditSelectWrapperDropDown").hide();
                },

                onHeaderClick: function (e) {
                    if (optionsDiv.css("display") == "none") {

                        optionsDiv.show()
                            .width(root.width() - 2)
                            .css("top", $(this).height() + this.offsetTop + 3);
                    } else {
                        optionsDiv.hide();
                    }

                    e.stopPropagation();
                }
            };

            var functions = {
                enumValue: function (value) {
                    if (value != null) {
                        _enumValue = value;
                        functions.getSelectedItemsFromEnumValue();
                        functions.getValueFromSelectedItems();
                    }
                    return _enumValue;
                },

                getSelectedItemsFromEnumValue: function () {
                    if (_enumValue == 0) {
                        $("input", optionsDiv).each(function () {
                            $(this).attr("checked", $(this).dataContext().val == 0);
                        });
                        return;
                    }
                    $("input", optionsDiv).each(function () {
                        var currentVal = $(this).dataContext().val;
                        $(this).attr("checked", currentVal != 0 && (_enumValue & currentVal) == currentVal);
                    });
                },

                getValueFromSelectedItems: function () {
                    var temp = _enumValue;
                    var value = "";
                    if (temp == 0) {
                        optionsDiv.find("input").each(function () {
                            if ($(this).dataContext().val == 0)
                                value = $(this).dataContext().name;
                        });
                    }
                    else {
                        var selectedInputs = optionsDiv.find("input").select(function (item) { return $(item).dataContext(); });
                        var sortedInputs = selectedInputs.sort(function (item1, item2) {
                            return item2.val - item1.val;
                        });
                        for (var i = 0; i < sortedInputs.length && temp != 0; i++) {
                            var ctx = sortedInputs[i];
                            if (ctx.val != 0 && (temp & ctx.val) == ctx.val) {
                                temp = temp & ~ctx.val;
                                if (value != "") {
                                    value = ", " + value;
                                }
                                value = ctx.name + value;
                            }
                        }
                    }

                    $("label", headerDiv).text(value);
                    attribute.onChanged({ value: value }, true);

                    functions.getSelectedItemsFromValue(value);
                },

                getSelectedItemsFromValue: function (value) {
                    if (value == null) {
                        return;
                    }

                    _isUpdatingValues = true;

                    $("input:checked", optionsDiv).each(function () {
                        _enumValue |= $(this).dataContext().val;
                    });
                    functions.getSelectedItemsFromEnumValue();
                    _isUpdatingValues = false;
                },

                createSelectWrapper: function () {
                    functions.createWrapperHeader();
                    functions.createWrapperDropDown();
                },

                createWrapperHeader: function () {
                    headerDiv = $.createElement("div");
                    var label = $.createElement("label");

                    label.text(attribute.value);
                    headerDiv.addClass("persistentObjectAttributeEditSelectWrapperHeader")
                        .append(label)
                        .on("click", eventFunctions.onHeaderClick);
                    root.append(headerDiv);
                },

                createWrapperDropDown: function () {
                    optionsDiv = $.createElement("div")
                        .addClass("persistentObjectAttributeEditSelectWrapperDropDown")
                        .hide();

                    options.each(function () {
                        var div = $.createElement("div");
                        var checkbox = $.createInput("checkbox");
                        var label = $.createElement("label");
                        var val = $(this).val();
                        var name = val.substring(val.indexOf("=") + 1, val.length);
                        var intVal = parseInt(val.substring(0, val.indexOf("=")), 10);

                        checkbox.dataContext({ name: name, val: intVal })
                            .on("change", eventFunctions.onCheckBoxChange)
                            .on("click", function (e) { e.stopPropagation(); });
                        label.text(name);
                        div.append(checkbox)
                            .append(label)
                            .on("click", eventFunctions.onCheckDivClick);
                        optionsDiv.append(div);
                        if (values.contains(name)) {
                            checkbox.attr("checked", true);
                            checkbox.change();
                        }

                    });

                    root.append(optionsDiv);
                },

                deselectAll: function () {
                    $("input:checked", optionsDiv).each(function () {
                        if ($(this).dataContext().val != 0) {
                            $(this).attr("checked", false);
                        }
                    });
                },

                toggleChecked: function (checkBox) {
                    if (!_isUpdatingValues) {
                        var ctx = checkBox.dataContext();
                        if (ctx.val == 0) {
                            functions.enumValue(0);
                            return;
                        }

                        if (checkBox.attr("checked"))
                            functions.enumValue(_enumValue |= ctx.val);
                        else
                            functions.enumValue(_enumValue & ~ctx.val);
                    }
                }
            };

            var root = $(this);
            var sourceSelect = $(".persistentObjectAttributeEditSelect", root);
            var options = $("option", sourceSelect);
            var attribute = root.dataContext();
            var headerDiv;
            var optionsDiv;
            var values;
            if (attribute.value == null)
                values = [];
            else
                values = attribute.value.split(", ");
            sourceSelect.hide();
            functions.createSelectWrapper();
            $(document).off("click.flaggedComboBox", eventFunctions.onDocumentClick);
            $(document).on("click.flaggedComboBox", eventFunctions.onDocumentClick);
        });
    };

    $.fn.vidyanoEditableSelect = function () {
        $(this).each(function () {
            var select = $(this);
            var attribute = select.dataContext();
            select.editableSelect({
                selectedValue: attribute.value,
                bg_iframe: false,
                onSelect: function (value) { attribute.setValue(value); },
                case_sensitive: false,
                items_then_scroll: 10
            });
        });
    };

    $.fn.vidyanoSelect = function () {
        $(this).each(function () {
            var select = $(this).find("select");
            var attribute = select.dataContext();
            select.on("change", function (e) { attribute.setValue(e.target.value); });

            if (attribute.type == "KeyValueList") {
                var options = attribute.selectInPlaceOptions();
                options.run(function (option) {
                    select.append("<option value='" + option.key + "'" + (attribute.value == option.key ? ' selected="selected"' : "") + ">" + option.value + "</option>");
                });

                if (attribute.value == null && attribute.isRequired && options.length > 0) {
                    select.val(options[0].key);
                    attribute.setValue(options[0].key);
                }
            }
            else {
                attribute.options.run(function (option) {
                    select.append("<option" + (attribute.value == option ? ' selected="selected"' : "") + ">" + option + "</option>");
                });

                if (attribute.value == null && attribute.isRequired && attribute.options.length > 0) {
                    select.val(attribute.options[0]);
                    attribute.setValue(attribute.options[0]);
                }
            }
        });
    };

    $.fn.vidyanoTriState = function () {
        $(this).each(function () {
            var root = $(this);
            var inputs = $('input', root);
            var labels = $('label', root);
            var attribute = root.dataContext();
            var value = ServiceGateway.fromServiceString(attribute.value, attribute.type);

            if (value == null)
                $(inputs[1]).attr("checked", true);
            else if (value)
                inputs.first().attr("checked", true);
            else
                inputs.last().attr("checked", true);

            root.find(".persistentObjectAttributeRadioSet").buttonset().show();

            var width = Math.max(labels.first().width(), labels.last().width());

            labels.first().width(width);
            labels.last().width(width);

            inputs.on('click', function () {
                attribute.setValue(Boolean.parse($(this).val()));
            });
        });
    };

    $.fn.vidyanoString = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var charCasing = attribute.getTypeHint("CharacterCasing", "Normal");
            var changeCasing = charCasing != "Normal";

            var input = root.find("input");
            input.val(attribute.value);
            input.on("keyup", function (e) {
                var keyCode = e.keyCode || e.which;
                if (keyCode == 16 || keyCode == 17 || keyCode == 40 || keyCode == 39 || keyCode == 38 || keyCode == 37)
                    return;

                var textBox = $(this);
                var carretStartIndex = 0, carretEndIndex = 0;

                if (changeCasing) {
                    carretStartIndex = this.selectionStart;
                    carretEndIndex = this.selectionEnd;
                    textBox.val(methods.toCharCase(textBox.val(), charCasing));
                }

                attribute.onChanged(this, false);

                if (changeCasing) {
                    this.selectionStart = carretStartIndex;
                    this.selectionEnd = carretEndIndex;
                }
            });
            input.on("blur", function () {
                if (changeCasing) {
                    var textBox = $(this);
                    textBox.val(methods.toCharCase(textBox.val(), charCasing));
                }
                attribute.onChanged(this, true);
            });
        });
    };

    $.fn.vidyanoReference = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var events = {
                browseReferenceCompleted: function () {
                    clearButton.show();
                },
                clearReferenceCompleted: function () {
                    clearButton.hide();
                },
                addReference: function () {
                    attribute.addNewReference();
                },
                browseReference: function () {
                    attribute.browseReference(events.browseReferenceCompleted);
                },
                clearReference: function () {
                    attribute.clearReference(events.clearReferenceCompleted);
                }
            };

            var clearButton = root.find('.clearButton');
            var addButton = root.find('.addReferenceButton');
            var browseButton = root.find('.browseReferenceButton');

            var inputBox = root.find('input');
            if (inputBox.length == 1) {
                inputBox.val(attribute.value);

                if (attribute.isEditable) {
                    inputBox.removeAttr('readonly');
                    inputBox.on("blur", function () {
                        attribute.onChanged(this, true);
                    });
                }
            }
            else {
                var selectBox = root.find('select');
                if (selectBox.length == 1) {
                    selectBox.val(attribute.objectId);
                    selectBox.on("change", function () {
                        var val = selectBox.val();
                        if (isNullOrEmpty(val))
                            events.clearReference();
                        else
                            attribute.changeReference([{ id: val, toServiceObject: function () { return { id: val }; } }], null);
                    });
                }
            }

            if (attribute.isReadOnly) {
                clearButton.hide();
                addButton.hide();
                browseButton.hide();
            } else {
                clearButton.button();
                addButton.button();
                browseButton.button();

                addButton.on('click', events.addReference);
                browseButton.on('click', events.browseReference);
                clearButton.on('click', events.clearReference);

                if (attribute.isRequired || attribute.objectId == null)
                    clearButton.hide();
                else
                    clearButton.show();

                if (attribute.canAddNewReference)
                    addButton.show();
                else
                    addButton.hide();
            }
        });
    };

    $.fn.vidyanoEditImage = function () {
        $(this).each(function () {
            var events = {
                clearImage: function () {
                    $(this).dataContext().onChanged({ value: null }, true);
                    imageDiv.empty();
                    clearButton.hide();
                },
                imageChanged: function () {
                    $(this).dataContext().onChanged(this, true);
                    var path = this.value;
                    var fileName = path.substring(path.lastIndexOf("\\") + 1, path.length);

                    imageDiv.empty();
                    imageDiv.append($.createElement("div").addClass("PersistentObjectAttributeValueImageFileNameText").append($.createElement("span").append(fileName)));

                    fileInput.isChanged = true;
                    clearButton.show();
                }
            };

            var root = $(this);
            var dataContext = root.dataContext();
            var po = dataContext.parent;
            var clearButton = root.find('.clearButton');
            var editButton = root.find('.editButton');
            var fileInput = root.find('.persistentObjectAttributefileInput');
            var imageDiv = root.find('.persistentObjectAttributeValueImageContainer');

            po.registerInput(dataContext, fileInput);

            clearButton.button()
                .on('click', events.clearImage);
            editButton.button();
            fileInput.on('change', events.imageChanged);

            if (isNullOrWhiteSpace(dataContext.value)) {
                clearButton.hide();
            }
            else {
                var width = dataContext.getTypeHint("Width");
                var height = dataContext.getTypeHint("Height", "20px");
                imageDiv.css({ height: height });
                imageDiv.find("img").css({ width: width, height: height });
            }
        });
    };

    $.fn.vidyanoEditTemplate = function () {
        $(this).each(function () {
            var root = $(this);
            var po = root.dataContext();

            var dataAttribute = po.getAttribute("Data");
            var data = JSON.parse(dataAttribute.value);

            var dataFieldSet = root.find('fieldset');
            dataFieldSet.empty();
            dataFieldSet.dataContext(data);

            for (var environment in data) {
                var themes = data[environment].themes;
                for (var theme in themes) {
                    if (environment != "Web") {
                        var currentTemplate = themes[theme];
                        var label = $.createElement("label");
                        label.append(environment + ': ' + theme);
                        label.addClass("persistentObjectAttributeLabel");
                        dataFieldSet.append(label);

                        var textArea = $.createElement("textarea", currentTemplate).text(currentTemplate.data.replace(/\r\n|\r|\n/g, "\r\n"));
                        textArea.css("width", "100%");
                        textArea.css("height", "150px");
                        if (!po.inEdit)
                            textArea.attr("disabled", "disabled");

                        var textareaContainer = $.createElement("div").addClass("persistentObjectAttributeControl").append(textArea);
                        dataFieldSet.append(textareaContainer);

                        var options = {
                            mode: "xml",
                            matchBrackets: true,
                            tabSize: 2,
                        };

                        if (po.inEdit) {
                            var editor;

                            var onTextAreaChanged = function (lostFocus) {
                                var value = editor.getValue();
                                if (value != null && value != currentTemplate.data) {
                                    currentTemplate.data = value.replace(/\r\n|\r|\n/g, "\n");
                                    var stringData = JSON.stringify(data);
                                    dataAttribute.onChanged({ value: stringData }, lostFocus);
                                }
                            };

                            options.fixedGutter = true;
                            options.extraKeys = { 'Ctrl-Q': methods.toggleBrace };
                            options.onGutterClick = methods.braceFoldFunc;
                            options.lineNumbers = true;
                            options.onBlur = function () { onTextAreaChanged(currentTemplate, true); };
                            options.onChange = _.throttle(function () { onTextAreaChanged(false); }, 250);
                            editor = CodeMirror.fromTextArea(textArea[0], options);
                        } else {
                            options.readOnly = "nocursor";
                            CodeMirror.fromTextArea(textArea[0], options);
                        }
                    } else {
                        var currentTemplateWeb = themes[theme];
                        var labelWeb = $.createElement("label");
                        labelWeb.append(environment + ': ' + theme);
                        labelWeb.addClass("persistentObjectAttributeLabel");
                        dataFieldSet.append(labelWeb);

                        var textAreaWeb = $.createElement("textarea", currentTemplateWeb).text(currentTemplateWeb.data.replace(/\r\n|\r|\n/g, "\r\n"));
                        textAreaWeb.css("width", "100%");
                        textAreaWeb.css("height", "150px");
                        if (!po.inEdit)
                            textAreaWeb.attr("disabled", "disabled");

                        var textareaContainerWeb = $.createElement("div").addClass("persistentObjectAttributeControl").append(textAreaWeb);
                        dataFieldSet.append(textareaContainerWeb);

                        var optionsWeb = {
                            mode: "application/x-ejs",
                            matchBrackets: true,
                            tabSize: 2,
                        };

                        if (po.inEdit) {
                            var editorWeb;

                            var textAreaChanged = function (lostFocus) {
                                var value = editorWeb.getValue();
                                if (value != null && value != currentTemplateWeb.data) {
                                    currentTemplateWeb.data = value.replace(/\r\n|\r|\n/g, "\n");
                                    var stringData = JSON.stringify(data);
                                    dataAttribute.onChanged({ value: stringData }, lostFocus);
                                }
                            };

                            optionsWeb.fixedGutter = true;
                            optionsWeb.extraKeys = { 'Ctrl-Q': methods.toggleBrace };
                            optionsWeb.onGutterClick = methods.braceFoldFunc;
                            optionsWeb.lineNumbers = true;
                            optionsWeb.onBlur = function () { textAreaChanged(true); };
                            optionsWeb.onChange = _.throttle(function () { textAreaChanged(false); }, 250);
                            editorWeb = CodeMirror.fromTextArea(textAreaWeb[0], optionsWeb);
                        } else {
                            optionsWeb.readOnly = "nocursor";
                            CodeMirror.fromTextArea(textAreaWeb[0], optionsWeb);
                        }
                    }
                }
            }
        });
    };

    $.fn.vidyanoEditBinaryFile = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var po = attribute.parent;
            var fileInput = root.find('.persistentObjectAttributefileInput');
            var displayInput, browseButton;

            var functions = {
                createControl: function () {
                    var div = $.createElement("div");
                    var displayInputDiv = $.createElement("div");
                    displayInput = $.createInput("text");
                    browseButton = $.createElement("button");

                    displayInput.attr("readonly", "readonly");
                    displayInputDiv.addClass("persistentObjectAttributeValuePartFill")
                            .append(displayInput);
                    browseButton.button()
                            .addClass("persistentObjectAttributeValuePartRight")
                            .addClass("persistentObjectAttributeButton")
                            .addClass("browseReferenceButton");
                    div.addClass("persistentObjectAttributefileInputWrapper")
                            .append(fileInput);
                    root.empty();
                    root.append(browseButton, displayInputDiv, div);
                },

                positionFileInput: function () {
                    var width = browseButton.outerWidth();
                    var height = browseButton.outerHeight();
                    var left = browseButton.position().left;
                    var top = browseButton.position().top;
                    var div = root.find(".persistentObjectAttributefileInputWrapper");

                    div.css("top", top - 2)
                            .css("left", left + 5)
                            .width(width)
                            .height(height);
                    fileInput.width(width)
                            .height(height);
                }
            };

            po.registerInput(attribute, fileInput);
            fileInput.on('change', function () {
                var path = fileInput.val();
                displayInput.val(path.substring(path.lastIndexOf("\\") + 1, path.length));

                attribute.onChanged(this, true);
            });
            functions.createControl();
            functions.positionFileInput();
            displayInput.val(attribute.binaryFileName());
        });
    };

    $.fn.vidyanoBrowseCertificate = function () {
        $(this).each(function () {
            var root = $(this);
            var po = root.dataContext();
            var attribute = po.getAttribute("CertificateAsBase64");
            var fileInput = root.find('.persistentObjectAttributefileInput');
            var displayInput, browseButton;

            var functions = {
                createControl: function () {
                    var div = $.createElement("div");
                    var displayInputDiv = $.createElement("div");
                    displayInput = $.createInput("text");
                    browseButton = $.createElement("button");

                    displayInput.attr("readonly", "readonly");
                    displayInputDiv.addClass("persistentObjectAttributeValuePartFill")
                            .append(displayInput);
                    browseButton.button()
                            .addClass("persistentObjectAttributeValuePartRight")
                            .addClass("persistentObjectAttributeButton")
                            .addClass("browseReferenceButton");
                    div.addClass("persistentObjectAttributefileInputWrapper")
                            .append(fileInput);
                    root.append(browseButton, displayInputDiv, div);
                },

                positionFileInput: function () {
                    var width = browseButton.outerWidth();
                    var height = browseButton.outerHeight();
                    var left = browseButton.position().left;
                    var top = browseButton.position().top;
                    var div = root.find(".persistentObjectAttributefileInputWrapper");

                    div.css("top", top - 2)
                            .css("left", left + 5)
                            .width(width)
                            .height(height);
                    fileInput.width(width)
                            .height(height);
                }
            };

            po.registerInput(attribute, fileInput);
            fileInput.on('change', function () {
                var path = fileInput.val();
                displayInput.val(path.substring(path.lastIndexOf("\\") + 1, path.length));

                attribute.onChanged(this, true);
            });
            functions.createControl();
            functions.positionFileInput();
            displayInput.val(attribute.options[0]);
        });
    };

    $.fn.vidyanoMultiLineString = function (inEdit) {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var language = attribute.getTypeHint("Language");
            if (!isNullOrWhiteSpace(language)) {
                if (!inEdit) {
                    var parent = root.parent();
                    root.replaceWith("<div class='persistentObjectAttribute_MultiLineString'><textarea style='width: 100%'>" + (attribute.value || "") + "</textarea></div>");
                    root = parent.find(".persistentObjectAttribute_MultiLineString");
                }

                language = language.toLowerCase();

                // Check if language is supported
                if (language in CodeMirror.modes || language in CodeMirror.mimeModes) {
                    if (!isNullOrWhiteSpace(attribute.toolTip))
                        root.find(".toolTip").text(attribute.toolTip);

                    var textArea = root.find('textarea');
                    if (textArea.length > 0) {
                        var options = {
                            mode: language,
                            matchBrackets: true,
                            tabSize: 2
                        };
                        if (inEdit) {
                            options.fixedGutter = true;
                            options.extraKeys = {
                                'Ctrl-Q': methods.toggleBrace,
                                "F11": function () { root.toggleClass("CodeMirror-fullscreen"); }
                            };
                            options.onCursorActivity = function (e) {
                                attribute.lastCodeMirrorCursorPosition = e.getCursor();
                            };
                            if (language == "javascript")
                                options.extraKeys['Ctrl-Space'] = methods.autoCompleteJs;
                            else if (language == "xml")
                                options.extraKeys['Ctrl-Space'] = methods.autoCompleteXml;

                            options.onGutterClick = methods.braceFoldFunc;
                            options.lineNumbers = true;
                            options.onBlur = function () { attribute.setValue(editor.getValue()); };
                            options.onChange = _.throttle(function () { attribute.onChanged({ value: editor.getValue() }, false); }, 250);
                        }
                        else
                            options.readOnly = "nocursor";

                        var editor = CodeMirror.fromTextArea(textArea[0], options);
                        if (attribute.lastCodeMirrorCursorPosition != null)
                            editor.setCursor({ line: attribute.lastCodeMirrorCursorPosition.line, ch: attribute.lastCodeMirrorCursorPosition.ch });
                    }
                }
            }
        });
    };

    $.fn.vidyanoUserRightResource = function () {
        $(this).each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var input = root.find("input").hide();
            var selectContainer = root.find(".selectContainer");
            var toggleButton = root.find(".toggleButton").button();
            toggleButton.on("click", function() {
                if (input.is(":visible")) {
                    input.hide();
                    selectContainer.show();
                }
                else {
                    input.show();
                    selectContainer.hide();
                }
            });

            var actionsSelect = selectContainer.find(".actionsSelect");
            var schemasSelect = selectContainer.find(".schemasSelect");
            var persistentObjectsSelect = selectContainer.find(".persistentObjectsSelect");
            var attributesSelect = selectContainer.find(".attributesSelect");

            var actions = attribute.options[0].split(';');
            var schemasInfo = {};
            attribute.options[1].split(';').select(function (si) { return si.split('='); }).run(function (si) { schemasInfo[si[0]] = si[1].split('|'); });
            var attributes = attribute.options[2].split(';');
            var selectedAction = null, selectedSchema = null, selectedPersistentObject = null, selectedAttribute = null;
            
            actionsSelect.on("change", function (e) {
                var newAction = e.target.value;
                if (newAction != selectedAction) {
                    selectedAction = newAction;
                    updateAttributesVisibility();
                    updateValue();
                }
            });
            actions.run(function (option) {
                actionsSelect.append("<option" + (selectedAction == option ? ' selected="selected"' : "") + ">" + option + "</option>");
            });

            schemasSelect.on("change", function (e) {
                var newSchema = e.target.value;
                if (newSchema != selectedSchema) {
                    selectedSchema = newSchema;
                    selectedPersistentObject = "";
                    selectedAttribute = "";
                    updateValue();
                    updatePersistentObjects();
                }
            });
            schemasSelect.append("<option" + (isNullOrEmpty(selectedSchema) ? ' selected="selected"' : "") + "></option>");
            for (var schema in schemasInfo) {
                if (schemasInfo.hasOwnProperty(schema))
                    schemasSelect.append("<option" + (selectedSchema == schema ? ' selected="selected"' : "") + ">" + schema + "</option>");
            }

            persistentObjectsSelect.on("change", function(e) {
                var newPersistentObject = e.target.value;
                if (newPersistentObject != selectedPersistentObject) {
                    selectedPersistentObject = newPersistentObject;
                    attributes = null;
                    selectedAttribute = "";
                    updateValue();
                    updateAttributes();
                }
            });

            attributesSelect.on("change", function(e) {
                var newAttribute = e.target.value;
                if (newAttribute != selectedAttribute) {
                    selectedAttribute = newAttribute;
                    updateValue();
                }
            });

            function updatePersistentObjects() {
                persistentObjectsSelect.empty();
                
                if (isNullOrEmpty(selectedSchema)) {
                    persistentObjectsSelect.val("");
                    persistentObjectsSelect.attr("disabled", "disabled");
                    attributes = null;
                }
                else {
                    persistentObjectsSelect.append("<option" + (isNullOrEmpty(selectedPersistentObject) ? ' selected="selected"' : "") + "></option>");
                    schemasInfo[selectedSchema].run(function (po) { persistentObjectsSelect.append("<option" + (selectedPersistentObject == po ? ' selected="selected"' : "") + ">" + po + "</option>"); });
                    persistentObjectsSelect.val(selectedPersistentObject);
                    persistentObjectsSelect.removeAttr("disabled");
                }
                    
                updateAttributes();
            }
            
            function addAttributesOptions() {
                attributesSelect.append("<option" + (isNullOrEmpty(selectedAttribute) ? ' selected="selected"' : "") + "></option>");
                attributes.run(function (attr) { attributesSelect.append("<option" + (selectedAttribute == attr ? ' selected="selected"' : "") + ">" + attr + "</option>"); });
                attributesSelect.val(selectedAttribute);
                attributesSelect.removeAttr("disabled");
            }

            function updateAttributes() {
                attributesSelect.empty();
                attributesSelect.attr("disabled", "disabled");
                
                if (!isNullOrEmpty(selectedPersistentObject)) {
                    if (attributes == null || attributes.length == 0) {
                        app.gateway.executeAction("PersistentObject.Refresh", attribute.parent, null, null, null, function (result) {
                            if (isNullOrEmpty(result.notification)) {
                                attributes = result.getAttribute("Resource").options[2].split(';');
                                addAttributesOptions();
                            }
                            else
                                attribute.parent.showNotification(result.notification, result.notificationType);
                        }, function (e) {
                            attribute.parent.showNotification(e, "Error");
                        });
                    }
                    else
                        addAttributesOptions();
                }
                else
                    attributesSelect.val("");
            }

            function updateAttributesVisibility() {
                if (actionsWithAttributes.contains(selectedAction)) {
                    actionsSelect.css({ width: "24.5%" });
                    schemasSelect.css({ width: "24.5%" });
                    persistentObjectsSelect.css({ width: "24.5%" });
                    attributesSelect.css({ width: "24%" });
                    attributesSelect.show();
                } else {
                    attributesSelect.hide();
                    actionsSelect.css({ width: "33%" });
                    schemasSelect.css({ width: "33%" });
                    persistentObjectsSelect.css({ width: "32.5%" });
                    attributesSelect.css({ width: "0" });
                }
            }

            function readValue(value) {
                var parts = value.split('/');

                selectedAction = parts[0];

                if (parts.length >= 2) {
                    selectedSchema = parts[1];
                    selectedPersistentObject = "";

                    var dotIndex = selectedSchema.indexOf(".");
                    if (dotIndex >= 0) {
                        selectedPersistentObject = selectedSchema.substr(dotIndex + 1);
                        selectedSchema = selectedSchema.substr(0, dotIndex);
                    }

                    selectedAttribute = parts.length == 3 ? parts[2] : "";
                }
                else {
                    selectedSchema = "";
                    selectedPersistentObject = "";
                    selectedAttribute = "";
                }

                updatePersistentObjects();
                updateAttributesVisibility();

                actionsSelect.val(selectedAction);
                schemasSelect.val(selectedSchema);
            }

            function updateValue() {
                var value = selectedAction;
                if (!isNullOrEmpty(selectedSchema)) {
                    value += "/" + selectedSchema;
                    if (!isNullOrEmpty(selectedPersistentObject)) {
                        value += "." + selectedPersistentObject;
                        if (!isNullOrEmpty(selectedAttribute) && actionsWithAttributes.contains(selectedAction))
                            value += "/" + selectedAttribute;
                    }
                }

                attribute.setValue(value);
                input.val(value);
            }

            readValue(attribute.value);

            input.on("keyup", function (e) {
                var keyCode = e.keyCode || e.which;
                if (keyCode == 16 || keyCode == 17 || keyCode == 40 || keyCode == 39 || keyCode == 38 || keyCode == 37)
                    return;

                attribute.onChanged(this, false);
                readValue(attribute.value);
            });
            input.on("blur", function () {
                attribute.onChanged(this, true);
                readValue(attribute.value);
            });
        });
    };

    var actionsWithAttributes = [
        "QueryReadEditNew",
        "QueryReadEdit",
        "QueryRead",
        "Query",
        "Read",
        "ReadEdit",
        "ReadEditNew",
        "New",
        "Edit",
        "EditNew"
    ];
    var methods = {
        toCharCase: function (value, casing) {
            if (value != null) {
                if (casing == "Upper")
                    return value.toUpperCase();
                else if (casing == "Lower")
                    return value.toLowerCase();
            }
            return value;
        },
        braceFoldFunc: CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder),
        toggleBrace: function (cm) { methods.braceFoldFunc(cm, cm.getCursor().line); },
        autoCompleteJs: function (cm) { CodeMirror.simpleHint(cm, CodeMirror.javascriptHint); },
        autoCompleteXml: function (cm) { CodeMirror.simpleHint(cm, CodeMirror.xmlHint); }
    };
})(jQuery);