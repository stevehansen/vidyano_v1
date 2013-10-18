/// <reference path="Application.js" />
/// <reference path="CultureInfo.js" />

///////////////////////////////////////////////////////////////
/// Array Extensions //////////////////////////////////////////
///////////////////////////////////////////////////////////////

if (!Array.prototype.clear) {
    Array.prototype.clear = function Array$clear() {
        /// <summary>Clears this instance.</summary>

        this.splice(0, this.length);
    };
}

Array.prototype.remove = function Array$remove(s) {
    /// <summary>Removes all instances of s from this instance.</summary>

    for (var i = 0; i < this.length; i++) {
        if (s == this[i])
            this.splice(i, 1);
    }
};

Array.prototype.removeAll = function Array$removeAll(f, thisObject) {
    /// <summary>Removes all instances that match function f from this instance.</summary>

    if (this.length > 0) {
        for (var index = this.length - 1; index--;) {
            if (f.call(thisObject, this[index], index, this))
                this.splice(index, 1);
        }
    }
};

Array.prototype.firstOrDefault = function Array$firstOrDefault(f, thisObject) {
    /// <summary>Finds the first instance that matches the predicate, or the first instance if no predicate is specified. Returns null if nothing is found.</summary>
    /// <param name="f" type="Function" optional="true">An optional predicate.</param>

    if (f != null) {
        for (var index = 0; index < this.length; index++) {
            var element = this[index];
            if (f.call(thisObject, element, index, this))
                return element;
        }
    }
    else if (this.length > 0)
        return this[0];

    return null;
};

Array.prototype.last = function Array$last() {
    /// <summary>Gets the last element in this istance.</summary>

    return this[this.length - 1];
};

Array.prototype.orderBy = function Array$orderBy(f) {
    /// <summary>Orders this instance in ascending order by the specified condition, can be a Function or String indicating a property.</summary>

    if (f == null)
        f = function (self) { return self; };
    else if (typeof (f) == "string") {
        var property = f;
        f = function (i) { return i[property]; };
    }

    return this.sort(function (x, y) {
        var xValue = f(x);
        var yValue = f(y);

        if (xValue == yValue)
            return 0;

        return xValue < yValue ? -1 : 1;
    });
};

Array.prototype.orderByDescending = function Array$orderBy(f) {
    /// <summary>Orders this instance in descending order by the specified condition, can be a Function or String indicating a property.</summary>

    if (f == null)
        f = function (self) { return self; };
    else if (typeof (f) == "string") {
        var property = f;
        f = function (i) { return i[property]; };
    }

    return this.sort(function (x, y) {
        var xValue = f(x);
        var yValue = f(y);

        if (xValue == yValue)
            return 0;

        return xValue < yValue ? 1 : -1;
    });
};

Array.prototype.run = Array.prototype.forEach;

Array.prototype.select = function Array$select(f, thisObject) {
    /// <summary>Creates a new array consisting of the result of f on each element, can be a Function or String indicating a property.</summary>

    if (typeof (f) == "string") {
        var property = f;
        f = function (i) { return i[property]; };
    }

    return this.map(f, thisObject);
};

Array.prototype.where = function Array$where(f, thisObject) {
    /// <summary>Creates a new array consisting of the elements that matched the specified predicate, can be a Function or String indicating a property.</summary>

    if (typeof (f) == "string") {
        var property = f;
        f = function (i) { return i[property]; };
    }

    return this.filter(f, thisObject);
};

Array.prototype.toSelector = function () {
    var callbacks = {};
    var _selectedItem = null;
    var _selectedItems = null;

    this.allowNulls = true;

    this.onSelectedItemChanged = function (callback) {
        if (callback == null)
            throw "callback cannot be null.";

        return this._bind("selectedItemChanged", callback);
    };

    this.onSelectedItemsChanged = function (callback) {
        if (callback == null)
            throw "callback cannot be null.";

        return this._bind("selectedItemsChanged", callback);
    };

    this.selectFirst = function () {
        if (this.length > 0 && _selectedItem != this[0])
            this.selectedItem(this[0]);
    };

    this.selectedItem = function (item) {
        if (typeof (item) == "undefined")
            return _selectedItem;

        if (item == null && !this.allowNulls)
            throw "Item is null and array has AllowNulls set to false.";

        if (item != null && this.firstOrDefault(function (i) { return i == item; }) == null)
            throw "Item is not in this array.";

        if (_selectedItem != item) {
            _selectedItem = item;
            this._trigger("selectedItemChanged", _selectedItem);
        }
        return this;
    };

    this.selectedItems = function (items) {
        if (typeof (items) == "undefined")
            return _selectedItems;

        if (items == null && !this.allowNulls)
            throw "Items is null and array has AllowNulls set to false.";

        if (_selectedItems != items) {
            _selectedItems = items;
            this._trigger("selectedItemsChanged", _selectedItems);
        }
        return this;
    };

    this._bind = function (eventName, callback) {
        callbacks[eventName] = callbacks[eventName] || [];
        callbacks[eventName].push(callback);
        return this; // chainable
    };

    this._trigger = function (eventName, data) {
        var chain = callbacks[eventName];
        if (typeof chain == 'undefined' || chain == null)
            return this; // no callbacks for this event

        for (var i = 0; i < chain.length; i++)
            chain[i](data);

        return this;
    };

    return this;
};

Array.prototype.contains = function Array$contains(value) {
    /// <summary>Gets a value indicating that the value was found in this instance.</summary>
    /// <returns type="Boolean" />

    return this.indexOf(value) != -1;
};

Array.prototype.distinct = function Array$distinct(selector) {
    /// <summary>Creates a new array consisting of only the distinct values, selector can be a Function, String or null.</summary>

    var derivedArray = [];
    if (selector == null)
        selector = function (item) { return item; };
    else if (typeof (selector) == "string") {
        var property = selector;
        selector = function (item) { return item[property]; };
    }

    for (var i = 0; i < this.length; i++) {
        var element = selector(this[i]);
        if (!derivedArray.contains(element))
            derivedArray.push(element);
    }
    return derivedArray;
};

///////////////////////////////////////////////////////////////
/// Object Extensions /////////////////////////////////////////
///////////////////////////////////////////////////////////////

copyProperties = function (obj, propertyNames, includeNullValues, result) {
    /// <summary>Copy the speficied properties.</summary>

    result = result || {};
    propertyNames.forEach(function (p) {
        var value = obj[p];
        if (includeNullValues || (value != null && value !== false && (value !== 0 || p == "pageSize") && (!$.isArray(value) || value.length > 0)))
            result[p] = value;
    });
    return result;
};

changePrototype = function (obj, type) {
    /// <summary>Changes the prototype for the specified obj.</summary>

    if (typeof (changePrototype.supportsProto) == "undefined") {
        var x = {};
        var p = {};
        x.__proto__ = p;
        changePrototype.supportsProto = Object.getPrototypeOf && Object.getPrototypeOf(x) == p;
    }

    obj.constructor = type;
    obj.__proto__ = type.prototype;

    // NOTE: IE doesn't support __proto__ yet, so just copy over the methods
    if (!changePrototype.supportsProto) {
        for (var m in type.prototype) {
            if (m != "constructor" && m != "__proto__" && m != "prototype")
                obj[m] = type.prototype[m];
        }
    }
};

isNull = function (obj) {
    /// <summary>Checks if the object is null or undefined.</summary>
    /// <returns type="Boolean" />

    return obj == null;
};

isNullOrEmpty = function (obj) {
    /// <summary>Checks if the object is null, undefined, an empty string or an empty array.</summary>
    /// <returns type="Boolean" />

    return obj == null || obj.length == 0;
};

isNullOrWhiteSpace = function (str) {
    /// <summary>Checks if the object is null, undefined or a whitespace string.</summary>
    /// <returns type="Boolean" />

    return str == null || !(/\S/.test(str));
};

getRandom = function () {
    return (new Date().getTime() - app.bootTime).toString(36);
};

///////////////////////////////////////////////////////////////
/// TaskManager ///////////////////////////////////////////////
///////////////////////////////////////////////////////////////

function TaskManager() {
    var tasks = [];

    this.startTask = function (func) {
        tasks.push(func);
        func(func);
    };

    this.markDone = function (t) {
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i] == t) {
                tasks[i] = null;
                break;
            }
        }
    };

    this.waitForAll = function (onCompleted, onError) {
        var runningTask = tasks.firstOrDefault(function (item) { return item != null; });
        if (this.lastError != null)
            onError(this.lastError);
        else if (runningTask != null) {
            var currentTm = this;
            setTimeout(function () { currentTm.waitForAll(onCompleted, onError); }, 100);
        }
        else
            onCompleted();
    };

    this.markError = function (source, error) {
        for (var i = 0; i < tasks.length; i++) {
            if (source == tasks[i]) {
                this.lastError = error;
                tasks[i] = null;
            }
        }
    };
}

///////////////////////////////////////////////////////////////
/// String Extensions /////////////////////////////////////////
///////////////////////////////////////////////////////////////

String.empty = '';

String.prototype.contains = function (it) {
    return this.indexOf(it) != -1;
};

String._formatRE = /(\{[^\}^\{]+\})/g;
String._format = function String$_format(format, values, useLocale) {
    return format.replace(String._formatRE,
        function (str, m) {
            var index = parseInt(m.substr(1), 10);
            var value = values[index + 1];
            if (value == null)
                return '';
            if (value.format) {
                var formatSpec = null;
                var formatIndex = m.indexOf(':');
                if (formatIndex > 0) {
                    formatSpec = m.substring(formatIndex + 1, m.length - 1);
                }
                return useLocale ? value.localeFormat(formatSpec) : value.format(formatSpec);
            }
            else
                return useLocale ? (value.localeFormat ? value.localeFormat() : value.toLocaleString()) : value.toString();
        });
};

String.format = function String$format(format) {
    return String._format(format, arguments, /* useLocale */true);
};

String.fromChar = function String$fromChar(ch, count) {
    var s = ch;
    for (var i = 1; i < count; i++) {
        s += ch;
    }
    return s;
};

String.isNullOrEmpty = isNullOrEmpty;
String.isNullOrWhiteSpace = isNullOrWhiteSpace;

String.prototype.padLeft = function String$padLeft(totalWidth, ch) {
    if (this.length < totalWidth) {
        return String.fromChar(ch || ' ', totalWidth - this.length) + this;
    }
    return this;
};

String.prototype.padRight = function String$padRight(totalWidth, ch) {
    if (this.length < totalWidth) {
        return this + String.fromChar(ch || ' ', totalWidth - this.length);
    }
    return this;
};

String.prototype.endsWith = function String$endsWith(suffix) {
    if (!suffix.length) {
        return true;
    }
    if (suffix.length > this.length) {
        return false;
    }
    return (this.substr(this.length - suffix.length) == suffix);
};

String.prototype.startsWith = function String$startsWith(prefix) {
    if (!prefix.length) {
        return true;
    }
    if (prefix.length > this.length) {
        return false;
    }
    return (this.substr(0, prefix.length) == prefix);
};

String.prototype.insert = function String$insert(value, index) {
    var length = this.length;

    if (index == length) {
        return this.substring(0, index) + value;
    }
    return this.substring(0, index) + value + this.substring(index, length);
};

String.prototype.trimStart = function String$trimStart(c) {
    if (this.length == 0)
        return this;

    c = c || ' ';
    var i = 0;
    for (; this.charAt(i) == c && i < this.length; i++);
    return this.substring(i);
};

String.prototype.trimEnd = function String$trimEnd(c) {
    if (this.length == 0)
        return this;

    c = c ? c : ' ';
    var i = this.length - 1;
    for (; i >= 0 && this.charAt(i) == c; i--);
    return this.substring(0, i + 1);
};

String.prototype.trim = function String$trim(c) {
    return this.trimStart(c).trimEnd(c);
};

String.prototype.asDataUri = function String$asDataUri() {
    if (this.startsWith("iVBOR"))
        return "data:image/png;base64," + this;
    if (this.startsWith("/9j/"))
        return "data:image/jpeg;base64," + this;
    if (this.startsWith("R0lGOD"))
        return "data:image/gif;base64," + this;

    return "data:application/octet+stream;base64," + this;
};

///////////////////////////////////////////////////////////////
/// Number Extensions /////////////////////////////////////////
///////////////////////////////////////////////////////////////

Number.parse = function Number$parse(s) {
    if (!s || !s.length) {
        return 0;
    }
    if ((s.indexOf('.') >= 0) || (s.indexOf('e') >= 0) ||
        s.endsWith('f') || s.endsWith('F')) {
        return parseFloat(s);
    }
    return parseInt(s, 10);
};

Number.prototype.format = function Number$format(format) {
    if (format == null || (format.length == 0) || (format == 'i')) {
        format = 'G';
    }
    return this._netFormat(format, false);
};

Number.prototype.localeFormat = function Number$localeFormat(format) {
    if (format == null || (format.length == 0) || (format == 'i')) {
        format = 'G';
    }
    return this._netFormat(format, true);
};

Number.prototype.toLocaleString = function () {
    return this.localeFormat();
};

Number._commaFormat = function Number$_commaFormat(number, groups, decimal, comma) {
    var decimalPart = null;
    var decimalIndex = number.indexOf(decimal);
    if (decimalIndex > 0) {
        decimalPart = number.substr(decimalIndex);
        number = number.substr(0, decimalIndex);
    }

    var negative = number.startsWith('-');
    if (negative) {
        number = number.substr(1);
    }

    var groupIndex = 0;
    var groupSize = groups[groupIndex];
    if (number.length < groupSize) {
        return decimalPart ? number + decimalPart : number;
    }

    var index = number.length;
    var s = '';
    var done = false;
    while (!done) {
        var length = groupSize;
        var startIndex = index - length;
        if (startIndex < 0) {
            groupSize += startIndex;
            length += startIndex;
            startIndex = 0;
            done = true;
        }
        if (!length) {
            break;
        }

        var part = number.substr(startIndex, length);
        if (s.length) {
            s = part + comma + s;
        }
        else {
            s = part;
        }
        index -= length;

        if (groupIndex < groups.length - 1) {
            groupIndex++;
            groupSize = groups[groupIndex];
        }
    }

    if (negative) {
        s = '-' + s;
    }
    return decimalPart ? s + decimalPart : s;
};

Number.prototype._netFormat = function Number$_netFormat(format, useLocale) {
    var nf = useLocale ? CultureInfo.currentCulture.numberFormat : CultureInfo.invariantCulture.numberFormat;

    var s = '';
    var precision = -1;

    if (format.length > 1) {
        precision = parseInt(format.substr(1), 10);
    }

    var fs = format.charAt(0);
    switch (fs) {
        case 'd':
        case 'D':
            s = parseInt(Math.abs(this)).toString();
            if (precision != -1) {
                s = s.padLeft(precision, '0');
            }
            if (this < 0) {
                s = '-' + s;
            }
            break;
        case 'x':
        case 'X':
            s = parseInt(Math.abs(this)).toString(16);
            if (fs == 'X') {
                s = s.toUpperCase();
            }
            if (precision != -1) {
                s = s.padLeft(precision, '0');
            }
            break;
        case 'e':
        case 'E':
            if (precision == -1) {
                s = this.toExponential();
            }
            else {
                s = this.toExponential(precision);
            }
            if (fs == 'E') {
                s = s.toUpperCase();
            }
            break;
        case 'f':
        case 'F':
        case 'n':
        case 'N':
            if (precision == -1) {
                precision = nf.numberDecimalDigits;
            }
            s = this.toFixed(precision).toString();
            if (precision && (nf.numberDecimalSeparator != '.')) {
                var idx = s.indexOf('.');
                s = s.substr(0, idx) + nf.numberDecimalSeparator + s.substr(idx + 1);
            }
            if ((fs == 'n') || (fs == 'N')) {
                s = Number._commaFormat(s, nf.numberGroupSizes, nf.numberDecimalSeparator, nf.numberGroupSeparator);
            }
            break;
        case 'c':
        case 'C':
            if (precision == -1) {
                precision = nf.currencyDecimalDigits;
            }
            s = Math.abs(this).toFixed(precision).toString();
            if (precision && (nf.currencyDecimalSeparator != '.')) {
                var i = s.indexOf('.');
                s = s.substr(0, i) + nf.currencyDecimalSeparator + s.substr(i + 1);
            }
            s = Number._commaFormat(s, nf.currencyGroupSizes, nf.currencyDecimalSeparator, nf.currencyGroupSeparator);
            if (this < 0) {
                s = String.format(nf.currencyNegativePattern, s);
            }
            else {
                s = String.format(nf.currencyPositivePattern, s);
            }
            if (nf.currencySymbol != "$")
                s = s.replace("$", nf.currencySymbol);
            break;
        case 'p':
        case 'P':
            if (precision == -1) {
                precision = nf.percentDecimalDigits;
            }
            s = (Math.abs(this) * 100.0).toFixed(precision).toString();
            if (precision && (nf.percentDecimalSeparator != '.')) {
                var index = s.indexOf('.');
                s = s.substr(0, index) + nf.percentDecimalSeparator + s.substr(index + 1);
            }
            s = Number._commaFormat(s, nf.percentGroupSizes, nf.percentDecimalSeparator, nf.percentGroupSeparator);
            if (this < 0) {
                s = String.format(nf.percentNegativePattern, s);
            }
            else {
                s = String.format(nf.percentPositivePattern, s);
            }
            break;
        case 'g':
        case 'G':
            if (precision == -1)
                precision = 10;

            if (Math.floor(this) == this)
                s = this.toString();
            else
                s = this._netFormat("F" + precision, useLocale).trimEnd('0');
            break;
    }

    return s;
};

///////////////////////////////////////////////////////////////
/// Date Extensions ///////////////////////////////////////////
///////////////////////////////////////////////////////////////

Date._formatRE = /'.*?[^\\]'|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z/g;

Date.prototype.format = function Date$format(format) {
    if (format == null || (format.length == 0) || (format == 'i')) {
        format = 'G';
    }
    else if (format == 'id') {
        return this.toDateString();
    }
    else if (format == 'it') {
        return this.toTimeString();
    }

    return this._netFormat(format, false);
};

Date.prototype.localeFormat = function Date$localeFormat(format) {
    if (format == null || (format.length == 0) || (format == 'i')) {
        format = 'G';
    }
    else if (format == 'id') {
        return this.toLocaleDateString();
    }
    else if (format == 'it') {
        return this.toLocaleTimeString();
    }

    return this._netFormat(format, true);
};

Date.prototype._netFormat = function Date$_netFormat(format, useLocale) {
    var dt = this;
    var dtf = useLocale ? CultureInfo.currentCulture.dateFormat : CultureInfo.invariantCulture.dateFormat;

    if (format.length == 1) {
        switch (format) {
            case 'f':
                format = dtf.longDatePattern + ' ' + dtf.shortTimePattern;
                break;
            case 'F':
                format = dtf.dateTimePattern;
                break;
            case 'd':
                format = dtf.shortDatePattern;
                break;
            case 'D':
                format = dtf.longDatePattern;
                break;
            case 't':
                format = dtf.shortTimePattern;
                break;
            case 'T':
                format = dtf.longTimePattern;
                break;
            case 'g':
                format = dtf.shortDatePattern + ' ' + dtf.shortTimePattern;
                break;
            case 'G':
                format = dtf.shortDatePattern + ' ' + dtf.longTimePattern;
                break;
            case 'R':
            case 'r':
                dtf = CultureInfo.invariantCulture.dateFormat;
                format = dtf.gmtDateTimePattern;
                break;
            case 'u':
                format = dtf.universalDateTimePattern;
                break;
            case 'U':
                format = dtf.dateTimePattern;
                dt = new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(),
                dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds(), dt.getUTCMilliseconds());
                break;
            case 's':
                format = dtf.sortableDateTimePattern;
                break;
        }
    }

    if (format.charAt(0) == '%') {
        format = format.substr(1);
    }

    var re = Date._formatRE;
    var sb = '';

    re.lastIndex = 0;
    while (true) {
        var index = re.lastIndex;
        var match = re.exec(format);

        sb += format.slice(index, match ? match.index : format.length);
        if (!match) {
            break;
        }

        var fs = match[0];
        var part = fs;
        switch (fs) {
            case 'dddd':
                part = dtf.dayNames[dt.getDay()];
                break;
            case 'ddd':
                part = dtf.shortDayNames[dt.getDay()];
                break;
            case 'dd':
                part = ("00" + dt.getDate()).substr(-2);
                break;
            case 'd':
                part = dt.getDate();
                break;
            case 'MMMM':
                part = dtf.monthNames[dt.getMonth()];
                break;
            case 'MMM':
                part = dtf.shortMonthNames[dt.getMonth()];
                break;
            case 'MM':
                part = ("00" + (dt.getMonth() + 1)).substr(-2);
                break;
            case 'M':
                part = (dt.getMonth() + 1);
                break;
            case 'yyyy':
                part = dt.getFullYear();
                break;
            case 'yy':
                part = ("00" + (dt.getFullYear() % 100)).substr(-2);
                break;
            case 'y':
                part = (dt.getFullYear() % 100);
                break;
            case 'h':
            case 'hh':
                part = dt.getHours() % 12;
                if (!part) {
                    part = '12';
                }
                else if (fs == 'hh') {
                    part = ("00" + part).substr(-2);
                }
                break;
            case 'HH':
                part = ("00" + dt.getHours()).substr(-2);
                break;
            case 'H':
                part = dt.getHours();
                break;
            case 'mm':
                part = ("00" + dt.getMinutes()).substr(-2);
                break;
            case 'm':
                part = dt.getMinutes();
                break;
            case 'ss':
                part = ("00" + dt.getSeconds()).substr(-2);
                break;
            case 's':
                part = dt.getSeconds();
                break;
            case 't':
            case 'tt':
                part = (dt.getHours() < 12) ? dtf.amDesignator : dtf.pmDesignator;
                if (fs == 't') {
                    part = part.charAt(0);
                }
                break;
            case 'fff':
                part = ("000" + dt.getMilliseconds()).substr(-3);
                break;
            case 'ff':
                part = ("000" + dt.getMilliseconds()).substr(-3).substr(0, 2);
                break;
            case 'f':
                part = ("000" + dt.getMilliseconds()).substr(-3).charAt(0);
                break;
            case 'z':
                part = dt.getTimezoneOffset() / 60;
                part = ((part >= 0) ? '-' : '+') + Math.floor(Math.abs(part));
                break;
            case 'zz':
            case 'zzz':
                part = dt.getTimezoneOffset() / 60;
                part = ((part >= 0) ? '-' : '+') + ("00" + Math.floor(Math.abs(part))).substr(-2);
                if (fs == 'zzz') {
                    part += dtf.timeSeparator + ("00" + Math.abs(dt.getTimezoneOffset() % 60)).substr(-2);
                }
                break;
            default:
                if (part.charAt(0) == '\'') {
                    part = part.substr(1, part.length - 2).replace(/\\'/g, '\'');
                }
                break;
        }
        sb += part;
    }

    return sb;
};

Date.prototype.toLocaleString = function () {
    return this.localeFormat();
};

Date.prototype.netType = function Date$netType(value) {
    if (typeof (value) == "undefined")
        return this._netType || "DateTime";

    this._netType = value;
    return this;
};

Date.prototype.netOffset = function Date$netOffset(value) {
    if (typeof (value) == "undefined")
        return this._netOffset || this.getTimezoneOffset();

    this._netOffset = value;
    return this;
};

///////////////////////////////////////////////////////////////
/// Boolean extentions ////////////////////////////////////////
///////////////////////////////////////////////////////////////

Boolean.parse = function Boolean$parse(str) {
    if (str == null)
        return null;

    switch (str.toLowerCase()) {
        case "true":
            return true;
        case "false":
            return false;
        default:
            return null;
    }
};

///////////////////////////////////////////////////////////////
/// Abstract Events Dispatcher ////////////////////////////////
///////////////////////////////////////////////////////////////

var AbstractEventsDispatcher = function () { };
AbstractEventsDispatcher.prototype = {
    callbacks: {},
    global_callbacks: [],

    bind: function (eventName, callback) {
        this.callbacks[eventName] = this.callbacks[eventName] || [];
        this.callbacks[eventName].push(callback);
        return this; // chainable
    },

    trigger: function (eventName, data) {
        this.dispatch(eventName, data);
        this.dispatch_global(eventName, data);
        return this;
    },

    bind_all: function (callback) {
        this.global_callbacks.push(callback);
        return this;
    },

    bind_all_except: function (except, handler) {
        this.bind_all(function (eventName, eventData) {
            if (except.indexOf(eventName) > -1) return false;
            handler(eventName, eventData);
            return true;
        });
        return this;
    },

    dispatch: function (eventName, data) {
        var chain = this.callbacks[eventName];
        if (typeof chain == 'undefined' || chain == null) return; // no callbacks for this event
        for (var i = 0; i < chain.length; i++) {
            chain[i](data);
        }
    },

    dispatch_global: function (eventName, data) {
        for (var i = 0; i < this.global_callbacks.length; i++) {
            this.global_callbacks[i](eventName, data);
        }
    }
};

///////////////////////////////////////////////////////////////
/// StringBuilder /////////////////////////////////////////////
///////////////////////////////////////////////////////////////

StringBuilder = function StringBuilder$(s) {
    this._parts = s != null ? [s] : [];
    this.isEmpty = this._parts.length == 0;
};

StringBuilder.prototype = {
    append: function StringBuilder$append(s) {
        if (s != null) {
            this._parts.push(s);
            this.isEmpty = false;
        }
        return this;
    },

    appendLine: function StringBuilder$appendLine(s) {
        this.append(s);
        this.append('\r\n');
        this.isEmpty = false;
        return this;
    },

    clear: function StringBuilder$clear() {
        this._parts = [];
        this.isEmpty = true;
    },

    toString: function StringBuilder$toString(s) {
        return this._parts.join(s || '');
    }
};