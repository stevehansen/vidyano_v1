using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Vidyano.ViewModel.Actions;

namespace Vidyano
{
    public abstract class Hooks
    {
#pragma warning disable 1998
        internal virtual async Task<object> UserPictureFromUrl(string url)
        {
            return null;
        }

        public virtual async Task ShowNotification(string notification, NotificationType notificationType)
        {
        }

        protected internal virtual async Task OnAction(ExecuteActionArgs e)
        {
        }

        protected internal virtual void OnSessionUpdated(PersistentObject session)
        {
        }

        internal virtual PersistentObject OnConstruct(JObject model)
        {
            return new PersistentObject(model);
        }

        internal virtual Query OnConstruct(JObject model, PersistentObject parent, bool asLookup)
        {
            return new Query(model, parent, asLookup);
        }

        internal virtual void OnConstruct(PersistentObject po)
        {
        }

        internal virtual void OnConstruct(Query query)
        {
        }

        protected internal virtual void OnStream(string name, Stream stream)
        {
        }

        internal virtual void OnOpen(PersistentObject po)
        {
        }

        internal virtual void OnOpen(Query query)
        {
        }

        protected internal virtual async Task OnLoadProgramUnitItems(IList<ProgramUnitItem> items)
        {
        }

        internal virtual object ByteArrayToImageSource(MemoryStream memoryStream)
        {
            return null;
        }

        internal virtual async Task SignOut()
        {
        }

        internal virtual async Task OnActionCommand(ActionBase action, object obj)
        {
            await action.Execute(null);
        }

        internal string UniqueId { get; set; }
        internal virtual string GetSignedTimeStamp()
        {
            return null;
        }

        protected internal virtual async Task OnInitialized()
        {
        }

#pragma warning restore 1998
    }
}