(function ($) {
    $.fn.vidyanoDateEdit = function () {
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var date = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            var datePicker = root.find(".persistentObjectAttributeEditDateInput").vidyanoDatePicker(date, {
                onDateSelected: function (selectedDate, lostFocus) {
                    if (attribute.type == "Date" && selectedDate == null) {
                        datePicker.setDate(ServiceGateway.fromServiceString(attribute.value, attribute.type));
                    }
                    else {
                        attribute.onChanged({ value: selectedDate }, lostFocus);

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
        this.each(function () {
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
                onTimeSelected: function (selectedTime, lostFocus) {
                    if (attribute.type == "Time" && selectedTime == null) {
                        timePicker.setTime(ServiceGateway.fromServiceString(selectedTime, attribute.type));
                    }
                    else {
                        attribute.onChanged({ value: selectedTime }, lostFocus);

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
        this.each(function () {
            var root = $(this);
            var isClearing = false;
            var attribute = root.dataContext();

            function updateDateTime(lostFocus) {
                if (isClearing)
                    return;

                var now = new Date();

                if (isNullOrEmpty(selectedDate) && !isNullOrEmpty(selectedTime))
                    datePicker.setDate(now);
                if (!isNullOrEmpty(selectedDate) && isNullOrEmpty(selectedTime))
                    timePicker.setTime(now.format("HH:mm"));

                if (!isNullOrEmpty(selectedDate) && !isNullOrEmpty(selectedTime))
                    attribute.onChanged({ value: selectedDate + " " + selectedTime }, lostFocus);

                if (attribute.value)
                    clearButton.show();
                else
                    clearButton.hide();
            }

            var dateTime = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            var selectedDate = dateTime != null ? dateTime.format("MM/dd/yyyy") : null;
            var selectedTime = dateTime != null ? dateTime.format("HH:mm") : null;
            var datePicker = $(".persistentObjectAttributeEditDateInput", root).vidyanoDatePicker(dateTime, {
                onDateSelected: function (value, lostFocus) {
                    if (value == null)
                        selectedDate = null;
                    else
                        selectedDate = value.format("MM/dd/yyyy");

                    updateDateTime(lostFocus);
                }
            });
            var timePicker = $(".persistentObjectAttributeEditTime", root).vidyanoTimePicker(selectedTime, {
                onTimeSelected: function (value, lostFocus) {
                    selectedTime = value;

                    updateDateTime(lostFocus);
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
        this.each(function () {
            var root = $(this);
            var isClearing = false;
            var attribute = root.dataContext();

            function updateDateTime(lostFocus) {
                if (isClearing)
                    return;

                var now = new Date();

                if (isNullOrEmpty(selectedOffset) && (!isNullOrEmpty(selectedDate) || !isNullOrEmpty(selectedTime)))
                    offsetPicker.setOffset("+00:00");
                if (isNullOrEmpty(selectedDate) && (!isNullOrEmpty(selectedTime) || !isNullOrEmpty(selectedOffset)))
                    datePicker.setDate(now);
                if (isNullOrEmpty(selectedTime) && (!isNullOrEmpty(selectedDate) || !isNullOrEmpty(selectedOffset)))
                    timePicker.setTime(now.format("HH:mm"));

                if (!isNullOrEmpty(selectedDate) && !isNullOrEmpty(selectedTime) && !isNullOrEmpty(selectedOffset))
                    attribute.onChanged({ value: selectedDate + " " + selectedTime + " " + selectedOffset }, lostFocus);

                if (attribute.value)
                    clearButton.show();
                else
                    clearButton.hide();
            }

            var dateTime = ServiceGateway.fromServiceString(attribute.value, attribute.type);
            var selectedDate = dateTime != null ? dateTime.format("MM/dd/yyyy") : null;
            var selectedTime = dateTime != null ? dateTime.format("HH:mm") : null;
            var selectedOffset = dateTime != null ? dateTime.netOffset() : null;
            var datePicker = $(".persistentObjectAttributeEditDateInput", root).vidyanoDatePicker(dateTime, {
                onDateSelected: function (value, lostFocus) {
                    if (value == null)
                        selectedDate = null;
                    else
                        selectedDate = value.format("MM/dd/yyyy");

                    updateDateTime(lostFocus);
                }
            });
            var timePicker = $(".persistentObjectAttributeEditTime", root).vidyanoTimePicker(selectedTime, {
                onTimeSelected: function (value, lostFocus) {
                    selectedTime = value;

                    updateDateTime(lostFocus);
                }
            });
            var offsetPicker = $(".persistentObjectAttributeEditOffset", root).vidyanoOffsetPicker(selectedOffset, {
                onOffsetSelected: function (value) {
                    selectedOffset = value;

                    updateDateTime(true);
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
        this.each(function () {
            var root = $(this);
            var numericTextBox = root.find("input");
            var attribute = root.dataContext();
            var allowDecimal = attribute.type == "NullableDecimal" || attribute.type == "Decimal" || attribute.type == "NullableSingle" || attribute.type == "Single" || attribute.type == "NullableDouble" || attribute.type == "Double";
            var isNullable = attribute.type.startsWith("Nullable");
            var decimalSeparator = CultureInfo.currentCulture.numberFormat.numberDecimalSeparator;

            var eventFunctions = {
                onNumericTextBoxKeyPress: function (e) {
                    var keyCode = e.keyCode || e.which;
                    // Ignore backspace, tab, delete, arrows
                    if (keyCode == 8 || keyCode == 9 || keyCode == 16 || keyCode == 17 || keyCode == 40 || keyCode == 39 || keyCode == 38 || keyCode == 37)
                        return;

                    var carretIndex = numericTextBox[0].selectionStart;
                    var value = numericTextBox.val();

                    if (keyCode < 48 || keyCode > 57) {
                        if ((keyCode == 44 || keyCode == 46 || keyCode == 110) && !value.contains(decimalSeparator) && allowDecimal) {
                            numericTextBox.val(value.insert(decimalSeparator, carretIndex));
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
                        attribute.onChanged({ value: isNullOrWhiteSpace(value) ? isNullable ? null : 0 : numericTextBox.val().replace(decimalSeparator, ".") }, triggerRefresh);
                }
            };

            numericTextBox.val(attribute.value != null ? attribute.value.replace(".", decimalSeparator) : "")
                .on("keypress", eventFunctions.onNumericTextBoxKeyPress)
                .on("keyup", eventFunctions.onNumericTextBoxKeyUp)
                .on("change", eventFunctions.onNumericTextBoxValueChange);
        });
    };

    $.fn.vidyanoTranslatedString = function () {
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var options = attribute.options;
            var contents = JSON.parse(options[0]);
            var currentLanguage = options[1];
            var headers = JSON.parse(options[2]);
            
            var contentInput = root.find("input");
            contentInput.val(attribute.value);
            var languagesContainer = root.find(".persistentObjectAttributeEditLanguages").hide();
            var currentLanguageInput = null;

            function triggerDataContextChanged(skipContent) {
                languagesContainer.find("input").each(function () {
                    var $this = $(this);
                    var val = $this.val();

                    contents[$this.dataContext()] = val;

                    if (skipContent !== true && this == currentLanguageInput[0])
                        contentInput.val(val);
                });

                options[0] = JSON.stringify(contents);
                
                attribute.value = currentLanguageInput.val();
                attribute.isValueChanged = true;
                attribute.parent.isDirty(true);
            }

            contentInput
                .on("keyup change", function () {
                    currentLanguageInput.val($(this).val());

                    triggerDataContextChanged(true);
                });

            var languageCount = 0;
            for (var prop in contents) {
                languageCount++;

                var label = $.createElement("label");
                var input = $.createInput("text", prop);

                if (prop == currentLanguage) {
                    currentLanguageInput = input;
                    label.addClass("currentLanguage");
                }

                label.text(headers[prop] + ":");
                input.val(contents[prop]);
                languagesContainer.append(label).append(input);
            }

            if (languageCount > 1) {
                contentInput
                    .on("click", function () {
                        languagesContainer.show("fast");
                    });
                root.find(".editButton").button()
                    .on("click", function () {
                        if (languagesContainer.css("display") == "none") {
                            languagesContainer.show("fast");

                            contentInput[0].selectionStart = contentInput.val().length;
                        }
                        else
                            languagesContainer.hide("fast");
                    });
                languagesContainer.on("keyup change", "input", triggerDataContextChanged);
            }
            else
                root.find(".editButton").hide();
        });
    };

    $.fn.vidyanoFlagsEnum = function () {
        this.each(function () {
            var _enumValue;
            var _isUpdatingValues = false;

            var eventFunctions = {
                onCheckBoxChange: function () {
                    functions.toggleChecked($(this));
                },

                onCheckDivClick: function (e) {
                    var checkBox = $("input", $(this));

                    checkBox.prop("checked", !checkBox.prop("checked"));
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
                    }
                    else
                        optionsDiv.hide();

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
                        optionsDiv.find("input").each(function () {
                            $(this).prop("checked", $(this).dataContext().val == 0);
                        });
                        return;
                    }
                    optionsDiv.find("input").each(function () {
                        var currentVal = $(this).dataContext().val;
                        $(this).prop("checked", currentVal != 0 && (_enumValue & currentVal) == currentVal);
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
                        var selectedInputs = $.makeArray(optionsDiv.find("input")).map(function (item) { return $(item).dataContext(); });
                        var sortedInputs = selectedInputs.sort(function (item1, item2) {
                            return item2.val - item1.val;
                        });
                        for (var i = 0; i < sortedInputs.length && temp != 0; i++) {
                            var ctx = sortedInputs[i];
                            if (ctx.val != 0 && (temp & ctx.val) == ctx.val) {
                                temp = temp & ~ctx.val;
                                if (value != "")
                                    value = ", " + value;
                                value = ctx.name + value;
                            }
                        }
                    }

                    headerDiv.find("label").text(value);
                    attribute.onChanged({ value: value }, true);

                    functions.getSelectedItemsFromValue(value);
                },

                getSelectedItemsFromValue: function (value) {
                    if (value == null)
                        return;

                    _isUpdatingValues = true;

                    optionsDiv.find("input:checked").each(function () {
                        _enumValue |= $(this).dataContext().val;
                    });
                    functions.getSelectedItemsFromEnumValue();
                    _isUpdatingValues = false;
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

                    _enumValue = 0;
                    options.each(function () {
                        var div = $.createElement("div");
                        var checkbox = $.createInput("checkbox");
                        var label = $.createElement("label");
                        var val = $(this).val();
                        var name = val.substring(val.indexOf("=") + 1, val.length);
                        var intVal = parseInt(val.substring(0, val.indexOf("=")), 10);
                        var isChecked = values.contains(name);
                        if (isChecked)
                            _enumValue |= intVal;

                        checkbox.dataContext({ name: name, val: intVal })
                            .prop("checked", isChecked)
                            .on("change", eventFunctions.onCheckBoxChange)
                            .on("click", function (e) { e.stopPropagation(); });
                        label.text(name);
                        div.append(checkbox)
                            .append(label)
                            .on("click", eventFunctions.onCheckDivClick);
                        optionsDiv.append(div);
                    });

                    try {
                        _isUpdatingValues = true;

                        optionsDiv.find("input").each(function () {
                            var currentVal = $(this).dataContext().val;
                            if (currentVal != 0 && (_enumValue & currentVal) == currentVal)
                                $(this).prop("checked", true);
                        });
                    }
                    finally {
                        _isUpdatingValues = false;
                    }

                    root.append(optionsDiv);
                },

                deselectAll: function () {
                    optionsDiv.find("input:checked").each(function () {
                        if ($(this).dataContext().val != 0)
                            $(this).prop("checked", false);
                    });
                },

                toggleChecked: function (checkBox) {
                    if (!_isUpdatingValues) {
                        var ctx = checkBox.dataContext();
                        if (ctx.val == 0) {
                            functions.enumValue(0);
                            return;
                        }

                        if (checkBox.prop("checked"))
                            functions.enumValue(_enumValue |= ctx.val);
                        else
                            functions.enumValue(_enumValue & ~ctx.val);
                    }
                }
            };

            var root = $(this);
            var sourceSelect = root.find(".persistentObjectAttributeEditSelect");
            var options = sourceSelect.find("option");
            var attribute = root.dataContext();
            var headerDiv;
            var optionsDiv;
            var values;
            if (attribute.value == null)
                values = [];
            else
                values = attribute.value.split(", ");
            sourceSelect.hide();
            functions.createWrapperHeader();
            functions.createWrapperDropDown();
            $(document).off("click.flaggedComboBox", eventFunctions.onDocumentClick);
            $(document).on("click.flaggedComboBox", eventFunctions.onDocumentClick);
        });
    };

    $.fn.vidyanoEditableSelect = function () {
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var select = root.find("select");
            if (select.length == 0)
                select = root;

            select.editableSelect({
                selectedValue: attribute.value,
                onSelect: function (value) { attribute.setValue(value); },
                case_sensitive: false,
                items_then_scroll: 10
            });
        });
    };

    $.fn.vidyanoSelect = function () {
        this.each(function () {
            var select = $(this).find("select");
            var attribute = select.dataContext();
            select.on("change", function (e) { attribute.setValue(e.target.value); });

            if (attribute.type == "KeyValueList") {
                var options = attribute.selectInPlaceOptions();
                options.forEach(function (option) {
                    select.append("<option value='" + option.key + "'" + (attribute.value == option.key ? ' selected="selected"' : "") + ">" + option.value + "</option>");
                });

                if (attribute.value == null && attribute.isRequired && options.length > 0) {
                    select.val(options[0].key);
                    attribute.setValue(options[0].key);
                }
            }
            else {
                if (!attribute.isRequired && attribute.type != "Enum" && (attribute.options == null || !attribute.options.contains(null)))
                    select.append("<option" + (attribute.value == null ? ' selected="selected"' : "") + "></option>");

                attribute.options.forEach(function (option) {
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
        this.each(function () {
            var root = $(this);
            var inputs = root.find('input');
            var labels = root.find('label');
            var attribute = root.dataContext();
            var value = ServiceGateway.fromServiceString(attribute.value, attribute.type);

            if (value == null)
                $(inputs[1]).prop("checked", true);
            else if (value)
                inputs.first().prop("checked", true);
            else
                inputs.last().prop("checked", true);

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
        this.each(function () {
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

                var carretStartIndex = 0, carretEndIndex = 0;

                if (changeCasing) {
                    carretStartIndex = this.selectionStart;
                    carretEndIndex = this.selectionEnd;
                    input.val(methods.toCharCase(input.val(), charCasing));
                }

                attribute.onChanged(this, false);

                if (changeCasing) {
                    this.selectionStart = carretStartIndex;
                    this.selectionEnd = carretEndIndex;
                }
            });
            input.on("blur change", function () {
                if (changeCasing) {
                    var textBox = $(this);
                    textBox.val(methods.toCharCase(textBox.val(), charCasing));
                }
                attribute.onChanged(this, true);
            });

            var suggestButton = root.find(".suggestButton");
            var suggestionsSeparator = attribute.getTypeHint("SuggestionsSeparator");
            if (suggestionsSeparator != null && attribute.options != null && attribute.options.length > 0) {
                suggestButton.text("...");

                var optionsList = $.createElement("ul");
                attribute.options.forEach(function (option) {
                    if (attribute.value != null && attribute.value.contains(option))
                        return;

                    var optionSelector = $.createElement("li");
                    optionSelector.text(option);
                    optionSelector.click(function () {
                        attribute.setValue(isNullOrEmpty(attribute.value) ? option : (attribute.value.endsWith(suggestionsSeparator) ? attribute.value + option : attribute.value + suggestionsSeparator + option));
                        input.val(attribute.value);

                        optionSelector.remove();

                        if (optionsList.find("li").length == 0) {
                            optionsList.remove();
                            suggestButton.hide();
                        }
                    });

                    optionsList.append(optionSelector);
                });

                if (optionsList.find("li").length > 0) {
                    suggestButton.subMenu(optionsList);
                    suggestButton.show();
                }
                else
                    suggestButton.hide();
            }
            else
                suggestButton.hide();
        });
    };

    $.fn.vidyanoDetailReference = function () {
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var columns = attribute.lookup.columns.filter(function (c) { return !c.isHidden && c.width != "0"; }).orderBy("offset");
            var deleteAction = attribute.lookup.getAction("Delete");

            var calculateWidths = function () {
                var width = root.width();

                if (deleteAction != null)
                    width -= 24;

                columns.forEach(function (c) { c._detailColumnWidth = null; });

                var remainingWidth = width;
                columns.filter(function (c) { return c.width != null && !c.width.endsWith('%'); }).forEach(function (c) {
                    var intWidth = parseInt(c.width, 10);
                    if (!isNaN(intWidth)) {
                        c._detailColumnWidth = intWidth + "px";
                        remainingWidth -= intWidth;
                    }
                });

                var percentagesRemainingWidth = remainingWidth;
                columns.filter(function (c) { return c.width != null && c.width.endsWith('%'); }).forEach(function (c) {
                    var intWidthPercentage = parseInt(c.width, 10);
                    if (!isNaN(intWidthPercentage)) {
                        var intWidth = Math.floor(percentagesRemainingWidth * intWidthPercentage / 100);
                        c._detailColumnWidth = intWidth + "px";
                        remainingWidth -= intWidth;
                    }
                });

                var columnsWithoutWidth = columns.filter(function (c) { return c._detailColumnWidth == null; });
                var remainingColumnWidth = Math.floor(remainingWidth / columnsWithoutWidth.length) + "px";
                columnsWithoutWidth.forEach(function (c) {
                    c._detailColumnWidth = remainingColumnWidth;
                });
            };

            calculateWidths();

            var inEdit = attribute.parent.inEdit;
            var container = $.createElement("div").addClass("detailContainer");
            if (inEdit)
                container.addClass("inEdit");

            var table = $.createElement("table").appendTo(container);

            var hasHeader = attribute.getTypeHint("IncludeHeader", "False") == "True";
            if (hasHeader) {
                var thead = $.createElement("thead").appendTo(table);
                var headRow = $.createElement("tr").appendTo(thead);

                columns.forEach(function (c) {
                    c._detailTd = $.createElement("td", c).css("width", c._detailColumnWidth)
                        .text(c.label).appendTo(headRow);
                });

                if (deleteAction != null)
                    $.createElement("td").addClass("deleteDetail").appendTo(headRow);
            }

            var tbody = $.createElement("tbody").appendTo(table);
            var renderObject = function (obj) {
                if (obj._isDeleted)
                    return;

                var tr = $.createElement("tr", obj).addClass("detail " + (obj.isNew ? "new" : "existing"));
                tbody.append(tr);

                if (inEdit)
                    obj.beginEdit();
                else
                    obj.cancelEdit();

                columns.forEach(function (c) {
                    var td = $.createElement("td");
                    if (!hasHeader && tbody.find("tr").length == 1) {
                        c._detailTd = td;
                        td.css("width", c._detailColumnWidth);
                    }

                    var attr = obj.getAttribute(c.name);
                    if (attr != null) {
                        var attrDiv = attr._createControl();
                        attrDiv.dataContext(attr);
                        attrDiv.html(attr._getTemplate());
                        td.append(attrDiv);
                    }

                    tr.append(td);
                });

                if (deleteAction != null) {
                    var tdDelete = $.createElement("td").addClass("deleteDetail");
                    if (inEdit) {
                        tdDelete.append($.createElement("div").html("&nbsp;").addClass(deleteAction.iconClass)).on("click", function () {
                            tr.remove();
                            obj.target = null;

                            if (!obj.isNew) {
                                obj._isDeleted = true;

                                attribute.parent.isDirty(true);
                            } else
                                attribute.objects.remove(obj);
                        });
                    }
                    tr.append(tdDelete);
                }

                obj.target = tr;
                obj._postAttributeRender(tr);
            };

            attribute.objects.forEach(renderObject);

            root.append(container);

            if (inEdit) {
                var newAction = attribute.lookup.getAction("New");
                if (newAction != null) {
                    var lookupAttribute = attribute.displayAttribute;

                    $.createElement("button").addClass("newButton").text(newAction.displayName).button().on("click", function () {
                        app.gateway.executeAction("Query.New", attribute.parent, attribute.lookup, null, null, function (newObj) {
                            newObj.ownerDetailAttribute = attribute;

                            var addObject = function () {
                                attribute.objects.push(newObj);

                                renderObject(newObj);

                                attribute.parent.isDirty(true);
                            };

                            if (!String.isNullOrEmpty(lookupAttribute)) {
                                var lookupAttr = newObj.getAttribute(lookupAttribute);
                                if (lookupAttr != null && typeof (lookupAttr.browseReference) == "function") {
                                    lookupAttr.browseReference(addObject);
                                    return;
                                }
                            }

                            addObject();
                        }, function (ex) {
                            attribute.parent.showNotification(ex);
                        });
                    }).appendTo(container);
                }
            }

            root.on("resize", function () {
                calculateWidths();
                columns.forEach(function (c) {
                    c._detailTd.css("width", c._detailColumnWidth);
                });
            });
        });
    };

    $.fn.vidyanoReference = function () {
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            if (attribute.asDetail) {
                root.vidyanoDetailReference();
                return;
            }

            var clearButton = root.find('.clearButton');
            var addButton = root.find('.addReferenceButton');
            var browseButton = root.find('.browseReferenceButton');

            var functions = {
                addReference: function () {
                    attribute.addNewReference();
                },

                browseReference: function () {
                    var inputBox = root.find('input:first');
                    var input = inputBox.val();
                    if (input != null && input != "" && attribute.value != input)
                        attribute.onChanged(inputBox.get()[0], true, functions.onBrowseReferenceCompleted);
                    else
                        attribute.browseReference(functions.onBrowseReferenceCompleted, false);
                },

                clearReference: function () {
                    attribute.clearReference(functions.onClearReferenceCompleted);
                },

                initializeDefault: function () {
                    var inputBox = root.find('input:first');

                    inputBox.val(attribute.value);
                    browseButton.on('click', functions.browseReference);

                    if (attribute.isEditable) {
                        inputBox.on("blur", functions.onRootLostFocus);
                        inputBox.removeAttr('readonly');
                    }
                },

                initializeSelectInPlace: function () {
                    var selectBox = root.find('select:first');

                    selectBox.val(attribute.objectId);
                    selectBox.on("change", function () {
                        var val = selectBox.val();
                        if (isNullOrEmpty(val))
                            functions.clearReference();
                        else
                            attribute.changeReference([{ id: val, breadcrumb: selectBox.find("option:selected").text(), toServiceObject: function () { return { id: val }; } }], null);
                    });
                },

                onBrowseReferenceCompleted: function () {
                    clearButton.show();
                },

                onClearReferenceCompleted: function () {
                    clearButton.hide();
                },

                onRootLostFocus: function () {
                    var inputBox = root.find('input:first');
                    var input = inputBox.val();

                    if (!isNull(input) && input != "" && attribute.value != input)
                        attribute.onChanged(inputBox.get()[0], true, functions.onBrowseReferenceCompleted);
                }
            };

            if (attribute.selectInPlace)
                functions.initializeSelectInPlace();
            else
                functions.initializeDefault();

            if (attribute.isReadOnly) {
                clearButton.hide();
                addButton.hide();
                browseButton.hide();
            } else {
                clearButton.button();
                addButton.button();
                browseButton.button();

                addButton.on('click', functions.addReference);
                clearButton.on('click', functions.clearReference);

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
        this.each(function () {
            var events = {
                clearImage: function () {
                    attribute.onChanged({ value: null }, true);
                    imageDiv.empty();
                    clearButton.hide();
                },
                imageChanged: function () {
                    attribute.onChanged(this, true);
                    var path = this.value;
                    var fileName = path.substring(path.lastIndexOf("\\") + 1, path.length);

                    imageDiv.empty();
                    imageDiv.append($.createElement("div").addClass("PersistentObjectAttributeValueImageFileNameText").append($.createElement("span").append(fileName)));

                    fileInput.isChanged = true;

                    if (!attribute.isRequired)
                        clearButton.show();
                }
            };

            var root = $(this);
            var attribute = root.dataContext();
            var po = attribute.parent;
            var clearButton = root.find('.clearButton');
            var editButton = root.find('.editButton');
            var fileInput = root.find('.persistentObjectAttributefileInput');
            var imageDiv = root.find('.persistentObjectAttributeValueImageContainer');

            po.registerInput(attribute, fileInput);

            clearButton.button()
                .on('click', events.clearImage);
            editButton.button();
            fileInput.on('change', events.imageChanged);

            if (isNullOrEmpty(attribute.value)) {
                clearButton.hide();
            }
            else {
                var width = attribute.getTypeHint("Width");
                var height = attribute.getTypeHint("Height", "20px");
                imageDiv.css({ height: height });
                imageDiv.find("img").css({ width: width, height: height });

                if (attribute.isRequired)
                    clearButton.hide();
            }
        });
    };

    $.fn.vidyanoEditTemplate = function () {
        this.each(function () {
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
                                if (value != null) {
                                    value = value.replace(/\r\n|\r|\n/g, "\r\n");
                                    if (value != currentTemplateWeb.data) {
                                        currentTemplateWeb.data = value;
                                        var stringData = JSON.stringify(data);
                                        dataAttribute.onChanged({ value: stringData }, lostFocus);

                                        try {
                                            app.templateParser(value);
                                            po.showNotification("Parsed template successfully", "OK");
                                        } catch (e) {
                                            po.showNotification("Parsing template failed: " + (e.message || e), "Error");
                                        }
                                    }
                                }
                            };

                            optionsWeb.fixedGutter = true;
                            optionsWeb.extraKeys = { 'Ctrl-Q': methods.toggleBrace };
                            optionsWeb.onGutterClick = methods.braceFoldFunc;
                            optionsWeb.lineNumbers = true;
                            optionsWeb.onBlur = function () { textAreaChanged(true); };
                            optionsWeb.onChange = _.throttle(function () { textAreaChanged(false); }, 1000);
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
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var po = attribute.parent;
            var fileInput = root.find('.persistentObjectAttributefileInput');
            var displayInput, browseButton;

            var accept = attribute.getTypeHint("Accept");
            if (accept != null)
                fileInput.attr("accept", accept);

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
                            .addClass("persistentObjectAttributeValuePartRight persistentObjectAttributeButton browseReferenceButton");
                    div.addClass("persistentObjectAttributefileInputWrapper")
                            .append(fileInput);
                    root.empty();
                    root.append(browseButton, displayInputDiv, div);
                },

                positionFileInput: function () {
                    var width = browseButton.outerWidth();
                    var height = browseButton.outerHeight();
                    var position = browseButton.position();
                    var left = position.left;
                    var top = position.top;
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
                path = path.substring(path.lastIndexOf("\\") + 1, path.length);
                displayInput.val(path);

                fileInput.isChanged = true;
                attribute.onChanged({ value: path }, true);
            });
            functions.createControl();
            functions.positionFileInput();
            displayInput.val(attribute.binaryFileName());
        });
    };

    $.fn.vidyanoBrowseCertificate = function () {
        this.each(function () {
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
                path = path.substring(path.lastIndexOf("\\") + 1, path.length);
                displayInput.val(path);

                fileInput.isChanged = true;
                attribute.onChanged({ value: path }, true);
            });
            functions.createControl();
            functions.positionFileInput();
            displayInput.val(attribute.options[0]);
        });
    };

    $.fn.vidyanoMultiLineString = function (inEdit) {
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();
            var language = attribute.getTypeHint("Language");
            if (!isNullOrWhiteSpace(language)) {
                if (!inEdit) {
                    var parent = root.parent();
                    root.replaceWith("<div class='persistentObjectAttribute_MultiLineString'><textarea>" + (attribute.value || "") + "</textarea></div>");
                    root = parent.find(".persistentObjectAttribute_MultiLineString");
                }

                language = language.toLowerCase();

                // Check if language is supported
                if (language in CodeMirror.modes || language in CodeMirror.mimeModes) {
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
        this.each(function () {
            var root = $(this);
            var attribute = root.dataContext();

            var input = root.find("input").hide();
            var selectContainer = root.find(".selectContainer");
            selectContainer.css({ overflow: 'hidden', 'white-space': 'nowrap' });
            var toggleButton = root.find(".toggleButton").button();
            toggleButton.on("click", function () {
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
            attribute.options[1].split(';').map(function (si) { return si.split('='); }).forEach(function (si) { schemasInfo[si[0]] = si[1].split('|'); });
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
            actions.forEach(function (option) {
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

            persistentObjectsSelect.on("change", function (e) {
                var newPersistentObject = e.target.value;
                if (newPersistentObject != selectedPersistentObject) {
                    selectedPersistentObject = newPersistentObject;
                    attributes = null;
                    selectedAttribute = "";
                    updateValue();
                    updateAttributes();
                }
            });

            attributesSelect.on("change", function (e) {
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
                    var schemaInfo = schemasInfo[selectedSchema];
                    if (schemaInfo != null)
                        schemaInfo.forEach(function (po) { persistentObjectsSelect.append("<option" + (selectedPersistentObject == po ? ' selected="selected"' : "") + ">" + po + "</option>"); });
                    persistentObjectsSelect.val(selectedPersistentObject);
                    persistentObjectsSelect.removeAttr("disabled");
                }

                updateAttributes();
            }

            function addAttributesOptions() {
                attributesSelect.append("<option" + (isNullOrEmpty(selectedAttribute) ? ' selected="selected"' : "") + "></option>");
                attributes.forEach(function (attr) { attributesSelect.append("<option" + (selectedAttribute == attr ? ' selected="selected"' : "") + ">" + attr + "</option>"); });
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
                    actionsSelect.css({ width: "32.5%" });
                    schemasSelect.css({ width: "32.5%" });
                    persistentObjectsSelect.css({ width: "32.5%" });
                    attributesSelect.css({ width: "0" });
                    attributesSelect.hide();
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
        "EditNew",
        "EditNewDelete"
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