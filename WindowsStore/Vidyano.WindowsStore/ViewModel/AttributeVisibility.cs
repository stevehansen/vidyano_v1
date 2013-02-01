using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel
{
    [Flags]
    public enum AttributeVisibility
    {
        /// <summary>
        /// Never show the <see cref="PersistentObjectAttribute"/>.
        /// </summary>
        Never = 0,

        /// <summary>
        /// Show the <see cref="PersistentObjectAttribute"/> for any existing entity.
        /// </summary>
        Read = 1,

        /// <summary>
        /// Show the <see cref="PersistentObjectAttribute"/> on queries.
        /// </summary>
        Query = 2,

        /// <summary>
        /// Show the <see cref="PersistentObjectAttribute"/> for a new entity.
        /// </summary>
        New = 4,

        /// <summary>
        /// Always show the <see cref="PersistentObjectAttribute"/>.
        /// </summary>
        Always = Read | Query | New,
    }
}