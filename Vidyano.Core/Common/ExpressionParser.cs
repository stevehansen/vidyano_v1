using System;
using System.Collections.Generic;

namespace Vidyano.Common
{
    static class ExpressionParser
    {
        #region Fields

        public static readonly Func<int, bool> AlwaysTrue = _ => true;
        private static readonly Dictionary<string, Func<int, bool>> cache = new Dictionary<string, Func<int, bool>>();
        private static readonly string[] operands = { "<=", ">=", "<", ">", "!=", "=" };

        #endregion

        #region Public Methods

        public static Func<int, bool> Get(string expression)
        {
            if (string.IsNullOrEmpty(expression))
                return AlwaysTrue;

            expression = expression.Replace(" ", null).ToUpperInvariant();
            return cache.GetOrAdd(expression, Parse);
        }

        #endregion

        #region Private Methods

        private static Func<int, bool> Parse(string expression)
        {
            var parts = expression.Split('X');
            if (parts.Length > 1)
            {
                // Combine parts
                Func<int, bool> result = null;
                foreach (var part in parts)
                {
                    var newResult = Get(part);
                    if (result != null)
                    {
                        var previousResult = result;
                        result = arg => previousResult(arg) && newResult(arg);
                    }
                    else
                        result = newResult;
                }
                return result;
            }

            if (expression != parts[0])
                return Get(parts[0]);

            // Get operand
            foreach (var operand in operands)
            {
                var index = expression.IndexOf(operand, StringComparison.Ordinal);
                if (index >= 0)
                {
                    expression = expression.Replace(operand, null);
                    var op = operand;
                    if (index > 0)
                    {
                        if (op.Contains("<"))
                        {
                            op = op.Replace("<", ">");
                            return Get(op + expression);
                        }
                        if (op.Contains(">"))
                        {
                            op = op.Replace(">", "<");
                            return Get(op + expression);
                        }
                    }

                    var number = int.Parse(expression);
                    switch (op)
                    {
                        case "<":
                            return x => x < number;
                        case "<=":
                            return x => x <= number;
                        case ">":
                            return x => x > number;
                        case ">=":
                            return x => x >= number;
                        case "!=":
                            return x => x != number;
                        default:
                            return x => x == number;
                    }
                }
            }

            return AlwaysTrue;
        }

        #endregion
    }
}