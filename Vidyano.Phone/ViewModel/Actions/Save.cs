using System;
using System.Threading.Tasks;
using Vidyano.Commands;

namespace Vidyano.ViewModel.Actions
{
    sealed class Save : ActionBase
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
                Client.RootFrame.GoBack();

                if (wasNew && Parent.StateBehavior.HasFlag(StateBehavior.OpenAfterNew))
                {
                    string err = null;
                    try
                    {
                        await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(Parent.Id, Parent.ObjectId).ContinueWith(t =>
                        {
                            if (t.Result != null)
                                t.Result.OwnerQuery = Parent.OwnerQuery;

                            return t.Result;
                        }));
                    }
                    catch (Exception ex)
                    {
                        err = ex.Message;
                    }

                    if (!string.IsNullOrEmpty(err))
                        await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
                }
            }
        }
    }
}