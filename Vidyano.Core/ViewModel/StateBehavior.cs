using System;

namespace Vidyano.ViewModel
{
    [Flags]
    public enum StateBehavior
    {
        /// <summary>
        ///     None
        /// </summary>
        None = 0,

        /// <summary>
        ///     Opens the Persistent Object after a new instance is saved.
        /// </summary>
        OpenAfterNew = 1,

        /// <summary>
        ///     Opens an existing Persistent Object in the Edit state.
        /// </summary>
        OpenInEdit = 2,

        /// <summary>
        ///     Keeps an existing Persistent Object in the Edit state after a Save.
        /// </summary>
        StayInEdit = 4,
    }
}