using System;
using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class Save : ActionBase
    {
        public Save(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
        }

        internal override Definition[] DependentActions
        {
            get
            {
                return new[] { Service.Current.Actions["CancelSave"] };
            }
        }

        public override async Task Execute(object option)
        {
            var wasNew = Parent.IsNew;
            await Parent.Save();

            if (string.IsNullOrWhiteSpace(Parent.Notification) || Parent.NotificationType != NotificationType.Error)
            {
                Service.Current.CloseCachedObject(Parent);

                if (wasNew && Parent.StateBehavior.HasFlag(StateBehavior.OpenAfterNew))
                {
                    try
                    {
                        await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(Parent.Id, Parent.ObjectId));
                    }
                    catch (Exception ex)
                    {
                        ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
                    }
                }
            }
        }
    }
}