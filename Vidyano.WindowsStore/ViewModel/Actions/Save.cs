using System;
using System.Threading.Tasks;
using Vidyano.Commands;

namespace Vidyano.ViewModel.Actions
{
    class Save : ActionBase
    {
        public Save(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            IsVisible = CanExecute = true;
        }

        internal override Definition[] DependentActions
        {
            get { return new[] { Service.Current.Actions["CancelSave"] }; }
        }

        public override async Task Execute(object option)
        {
            var wasNew = Parent.IsNew;
            await Parent.Save();

            if (string.IsNullOrWhiteSpace(Parent.Notification) || Parent.NotificationType != NotificationType.Error)
            {
                Client.CurrentClient.CloseCachedObject(Parent);

                if (wasNew && Parent.StateBehavior.HasFlag(StateBehavior.OpenAfterNew))
                {
                    string err = null;
                    try
                    {
                        await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(Parent.Id, Parent.ObjectId));
                    }
                    catch (Exception ex)
                    {
                        err = ex.Message;
                    }

                    if (err != null)
                        await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
                }
            }
        }
    }
}