/**
 * AW Masked Input
 * @version 1.2.2
 * @author Kendall Conrad
 * @url http://www.angelwatt.com/coding/masked_input.php
 * @created 2008-12-16
 * @modified 2013-01-10
 * @license This work is licensed under a Creative Commons
 *  Attribution-Share Alike 3.0 United States License
 *  http://creativecommons.org/licenses/by-sa/3.0/us/
 *
 * Argument pieces {
 * @param elm [req] text input node to apply the mask on
 * @param format [req] string format for the mask
 * @param allowed [opt, '0123456789'] string with chars allowed to be typed
 * @param sep [opt, '\/:-'] string of char(s) used as separators in mask
 * @param typeon [opt, '_YMDhms'] string of chars in mask that can be typed on
 * @param onbadkey [opt, null] function to run when user types a unallowed key
 * @param badkeywait [opt, 0] used with onbadkey. Indicates how long (in ms) to lock text input for onbadkey function to run
 * @param preserve [opt, true] whether to preserve existing text in field during init unless empty then it fills it.
 * };
 */
(function (scope) {
    'use strict';

    scope.MaskedInput = function (args) {
        // Ensure passing in valid argument
        if (!args || !args.elm || !args.format) {
            return null;
        }
        // Ensure use of 'new'
        if (!(this instanceof scope.MaskedInput)) {
            return new scope.MaskedInput(args);
        }
        // Initialize variables
        var self = this,
            el = args['elm'],
            format = args['format'],
            allowed = args['allowed'] || '0123456789',
            sep = args['separator'] || '\/:-',
            open = args['typeon'] || '_YMDhms',
            onbadkey = args['onbadkey'] || function () { },
            badwait = args['badkeywait'] || 0,
            preserve = ('preserve' in args) ? !!args['preserve'] : true,
            // ----
            locked = false,
            startText = format;

        /**
         * Add events to objects.
         */
        var evtAdd = function (obj, type, fx, capture) {
            if (window.addEventListener) {
                return function (obj, type, fx, capture) {
                    obj.addEventListener(type, fx,
                        (capture === undefined) ? false : capture);
                };
            }
            if (window.attachEvent) {
                return function (obj, type, fx) {
                    obj.attachEvent('on' + type, fx);
                };
            }
            return function (obj, type, fx) {
                obj['on' + type] = fx;
            };
        }();

        /**
         * Initialize the object.
         */
        var init = function () {
            // Check if an input or textarea tag was passed in
            if (!el.tagName || (el.tagName.toUpperCase() !== 'INPUT' && el.tagName.toUpperCase() !== 'TEXTAREA')) {
                return null;
            }

            // Only place formatted text in field when not preserving
            // text or it's empty.
            if (!preserve || el.value == '') {
                el.value = format;
            }
            // Assign events
            evtAdd(el, 'keydown', function (e) {
                KeyHandlerDown(e);
            });
            evtAdd(el, 'keypress', function (e) {
                KeyHandlerPress(e);
            });
            // Let us set the initial text state when focused
            evtAdd(el, 'focus', function () {
                startText = el.value;
            });
            // Handle onChange event manually
            evtAdd(el, 'blur', function () {
                if (el.value !== startText && el.onchange) {
                    el.onchange();
                }
            });
            evtAdd(el, 'paste', function (e) {
                stopEvent(e, false);
            });
            return self;
        };

        /**
         * Gets the keyboard input in usable way.
         * @param code integer character code
         * @return string representing character code
         */
        var GetKey = function (code) {
            code = code || window.event;
            var ch = '',
                keyCode = code.which,
                evt = code.type;
            if (keyCode == null) {
                keyCode = code.keyCode;
            }
            // no key, no play
            if (keyCode === null) {
                return '';
            }
            // deal with special keys
            switch (keyCode) {
                case 8:
                    ch = 'bksp';
                    break;
                case 46: // handle del and . both being 46
                    ch = (evt == 'keydown') ? 'del' : '.';
                    break;
                case 16:
                    ch = 'shift';
                    break;
                case 0: /*CRAP*/
                case 9: /*TAB*/
                case 13:/*ENTER*/
                    ch = 'etc';
                    break;
                case 37: case 38: case 39: case 40: // arrow keys
                    ch = (!code.shiftKey &&
                             (code.charCode != 39 && code.charCode !== undefined)) ?
                        'etc' : String.fromCharCode(keyCode);
                    break;
                    // default to thinking it's a character or digit
                default:
                    ch = String.fromCharCode(keyCode);
            }
            return ch;
        };

        /**
         * Stop the event propogation chain.
         * @param evt Event to stop
         * @param ret boolean, used for IE to prevent default event
         */
        var stopEvent = function (evt, ret) {
            // Stop default behavior the standard way
            if (evt.preventDefault) {
                evt.preventDefault();
            }
            // Then there's IE
            evt.returnValue = ret || false;
        };

        /**
         * Handles the key down events.
         * @param e Event
         */
        var KeyHandlerDown = function (e) {
            e = e || event;
            if (locked) {
                stopEvent(e);
                return false;
            }
            var key = GetKey(e);
            // Stop cut and paste
            if ((e.metaKey || e.ctrlKey) && (key == 'X' || key == 'V')) {
                stopEvent(e);
                return false;
            }
            // Allow for OS commands
            if (e.metaKey || e.ctrlKey) {
                return true;
            }
            if (el.value == '') {
                el.value = format;
                SetTextCursor(el, 0);
            }
            // Only do update for bksp del
            if (key == 'bksp' || key == 'del') {
                Update(key);
                stopEvent(e);
                return false;
            }
            else {
                return true;
            }
        };

        /**
         * Handles the key press events.
         * @param e Event
         */
        var KeyHandlerPress = function (e) {
            e = e || event;
            if (locked) {
                stopEvent(e);
                return false;
            }
            var key = GetKey(e);
            // Check if modifier key is being pressed; command
            if (e.ctrlKey && e.altKey) {
                stopEvent(e);
                return false;
            }

            if (key == 'etc' || e.metaKey || e.ctrlKey || e.altKey) {
                return true;
            }
            if (key != 'bksp' && key != 'del' && key != 'shift') {
                if (!GoodOnes(key)) {
                    stopEvent(e);
                    return false;
                }
                if (Update(key)) {
                    stopEvent(e, true);
                    return true;
                }
                stopEvent(e);
                return false;
            }
            else {
                return false;
            }
        };

        /**
         * Updates the text field with the given key.
         * @param key string keyboard input.
         */
        var Update = function (key) {
            var p = GetTextCursor(el),
                c = el.value,
                val = '';
            // Handle keys now
            switch (true) {
                // Allowed characters
                case (allowed.indexOf(key) != -1):
                    // if text cursor at end
                    if (++p > format.length) {
                        return false;
                    }
                    // Handle cases where user places cursor before separator
                    while (sep.indexOf(c.charAt(p - 1)) != -1 && p <= format.length) {
                        p++;
                    }
                    val = c.substr(0, p - 1) + key + c.substr(p);
                    // Move csor up a spot if next char is a separator char
                    if (allowed.indexOf(c.charAt(p)) == -1
                            && open.indexOf(c.charAt(p)) == -1) {
                        p++;
                    }
                    break;
                case (key == 'bksp'): // backspace
                    // at start of field
                    if (--p < 0) {
                        if (el.selectionEnd == el.value.length) {
                            el.value = format;
                            el.selectionStart = el.selectionEnd = 0;
                        }

                        return false;
                    }
                    // If previous char is a separator, move a little more
                    while (allowed.indexOf(c.charAt(p)) == -1
                            && open.indexOf(c.charAt(p)) == -1
                            && p > 1) {
                        p--;
                    }
                    val = c.substr(0, p) + format.substr(p, 1) + c.substr(p + 1);
                    break;
                case (key == 'del'): // forward delete
                    // at end of field
                    if (p >= c.length) {
                        return false;
                    }
                    // If next char is a separator and not the end of the text field
                    while (sep.indexOf(c.charAt(p)) != -1
                             && c.charAt(p) != '') {
                        p++;
                    }
                    val = c.substr(0, p) + format.substr(p, 1) + c.substr(p + 1);
                    p++; // Move position forward
                    break;
                case (key == 'etc'):
                    // Catch other allowed chars
                    return true;
                default:
                    return false; // Ignore the rest
            }
            el.value = ''; // blank it first (Firefox issue)
            el.value = val; // put updated value back in
            SetTextCursor(el, p); // Set the text cursor
            return false;
        };

        /**
         * Gets the current position of the text cursor in a text field.
         * @param node a input or textarea HTML node.
         * @return int text cursor position index, or -1 if there was a problem.
         */
        var GetTextCursor = function (node) {
            try {
                if (node.selectionStart >= 0) {
                    return node.selectionStart;
                }
                else if (document.selection) {// IE
                    var ntxt = node.value; // getting starting text
                    var rng = document.selection.createRange();
                    rng.text = '|%|';
                    var start = node.value.indexOf('|%|');
                    rng.moveStart('character', -3);
                    rng.text = '';
                    // put starting text back in,
                    // fixes issue if all text was highlighted
                    node.value = ntxt;
                    return start;
                }
                return -1;
            }
            catch (e) {
                return -1;
            }
        };

        /**
         * Sets the text cursor in a text field to a specific position.
         * @param node a input or textarea HTML node.
         * @param pos int of the position to be placed.
         * @return boolean true is successful, false otherwise.
         */
        var SetTextCursor = function (node, pos) {
            try {
                if (node.selectionStart) {
                    node.focus();
                    node.setSelectionRange(pos, pos);
                }
                else if (node.createTextRange) { // IE
                    var rng = node.createTextRange();
                    rng.move('character', pos);
                    rng.select();
                }
            }
            catch (e) {
                return false;
            }
            return true;
        };

        /**
         * Returns whether or not a given input is valid for the mask.
         * @param k string of character to check.
         * @return bool true if it's a valid character.
         */
        var GoodOnes = function (k) {
            // if not in allowed list, or invisible key action
            if (allowed.indexOf(k) == -1 && k != 'bksp' && k != 'del' && k != 'etc') {
                // Need to ensure cursor position not lost
                var p = GetTextCursor(el);
                locked = true;
                if (onbadkey(k) != true) {
                    // Hold lock long enough for onbadkey function to run
                    setTimeout(function () {
                        locked = false;
                        SetTextCursor(el, p);
                    }, badwait);
                }
                else
                    locked = false;

                return false;
            }
            return true;
        };

        /**
         * Resets the text field so just the format is present.
         */
        self.resetField = function () {
            el.value = format;
        };

        /**
         * Set the allowed characters that can be used in the mask.
         * @param a string of characters that can be used.
         */
        self.setAllowed = function (a) {
            allowed = a;
            resetField();
        };

        /**
         * The format to be used in the mask.
         * @param f string of the format.
         */
        self.setFormat = function (f) {
            format = f;
            resetField();
        };

        /**
         * Set the characters to be used as separators.
         * @param s string representing the separator characters.
         */
        self.setSeparator = function (s) {
            sep = s;
            resetField();
        };

        /**
         * Set the characters that the user will be typing over.
         * @param t string representing the characters that will be typed over.
         */
        self.setTypeon = function (t) {
            open = t;
            resetField();
        };

        return init();
    }
})(window);