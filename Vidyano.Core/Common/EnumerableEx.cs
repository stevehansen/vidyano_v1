using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Vidyano.Common
{
    /// <summary>
    ///     Provides extension methods for enumerables.
    /// </summary>
    public static class EnumerableEx
    {
        /// <summary>
        ///     Invokes the <paramref name="action" /> on each element as a side effect.
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="source">The source.</param>
        /// <param name="action">The action.</param>
        /// <returns></returns>
        [DebuggerStepThrough]
        public static IEnumerable<T> Do<T>(this IEnumerable<T> source, Action<T> action)
        {
            if (source != null && action != null)
            {
                foreach (var item in source)
                {
                    action(item);
                    yield return item;
                }
            }
        }

        /// <summary>
        ///     Runs through the specified source ending the lazy part of the enumerable.
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="source">The source.</param>
        [DebuggerStepThrough]
        public static void Run<T>(this IEnumerable<T> source)
        {
            if (source == null)
                return;

#pragma warning disable 168
            foreach (var item in source) {}
#pragma warning restore 168
        }

        /// <summary>
        ///     Runs through the specified source invoking the <paramref name="action" /> on each element.
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="source">The source.</param>
        /// <param name="action">The action that should be invoked on each element.</param>
        [DebuggerStepThrough]
        public static void Run<T>(this IEnumerable<T> source, Action<T> action)
        {
            if (source == null || action == null)
                return;

            foreach (var item in source)
                action(item);
        }

        /// <summary>
        ///     Create a enumerable that return element once.
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="element">The element that should be returned.</param>
        /// <returns></returns>
        public static IEnumerable<T> Return<T>(T element)
        {
            yield return element;
        }
    }
}