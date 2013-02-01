using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;

namespace Vidyano
{
    public class PersistentObjectClientActions
    {
        #region Public Methods

        public virtual void OnReceive(ReceivePersistentObjectArgs args)
        {
        }

        public virtual void OnReceive(ReceiveQueryArgs args)
        {
        }

        public virtual bool OnAction(ExecuteActionArgs args)
        {
            return args.IsHandled;
        }

        #endregion
    }

    public sealed class ReceiveQueryArgs
    {
        #region Constructors

        internal ReceiveQueryArgs(Query query)
        {
            Query = query;
        }

        #endregion

        #region Properties

        public Query Query { get; private set; }

        #endregion
    }

    public sealed class ReceivePersistentObjectArgs
    {
        #region Constructors

        internal ReceivePersistentObjectArgs(PersistentObject obj)
        {
            PersistentObject = obj;
        }

        #endregion

        #region Properties

        public PersistentObject PersistentObject { get; private set; }

        #endregion
    }
}
