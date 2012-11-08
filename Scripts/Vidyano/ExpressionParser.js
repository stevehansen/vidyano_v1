/// <reference path="Common.js" />

var ExpressionParser = (function () {
    var ep = {
        alwaysTrue: function() { return true; },
        cache: { },
        operands: ["<=", ">=", "<", ">", "!=", "="],

        get: function(expression) {
            if (isNullOrWhiteSpace(expression))
                return ep.alwaysTrue;

            expression = expression.replace(/ /g, "").toUpperCase();
            var result = ep.cache[expression];
            if (result == null)
                return ep.cache[expression] = ep.parse(expression);
            return result;
        },

        parse: function(expression) {
            var get = ep.get;
            var operands = ep.operands;

            var parts = expression.split('X');
            if (parts.length > 1) {
                // Combine parts
                var result = null;
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];

                    var newResult = get(part);
                    if (result != null) {
                        var previousResult = result;
                        result = function(arg) { return previousResult(arg) && newResult(arg); };
                    }
                    else
                        result = newResult;
                }
                return result;
            }

            if (expression != parts[0])
                return get(parts[0]);

            // Get operand
            for (var idx = 0; idx < operands.length; idx++) {
                var operand = operands[idx];

                var index = expression.indexOf(operand);
                if (index >= 0) {
                    expression = expression.replace(operand, "");
                    if (index > 0) {
                        // NOTE: Change 5< to >5
                        if (operand.contains("<"))
                            return get(operand.replace("<", ">") + expression);
                        if (operand.contains(">"))
                            return get(operand.replace(">", "<") + expression);
                    }

                    var number = parseInt(expression, 10);
                    if (!isNaN(number)) {
                        switch (operand) {
                        case "<":
                            return new Function("x", "return x < " + number + ";");
                        case "<=":
                            return new Function("x", "return x <= " + number + ";");
                        case ">":
                            return new Function("x", "return x > " + number + ";");
                        case ">=":
                            return new Function("x", "return x >= " + number + ";");
                        case "!=":
                            return new Function("x", "return x != " + number + ";");
                        default:
                            return new Function("x", "return x == " + number + ";");
                        }
                    }
                }
            }

            return ep.alwaysTrue;
        }
    };
    
    return ep;
})(window);