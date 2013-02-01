using System;
using System.Threading.Tasks;
using Windows.UI.Popups;

namespace Vidyano.ViewModel.Actions
{
    class Delete : QueryAction
    {
        public Delete(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            var dialog = new MessageDialog(Service.Current.Messages["AskForDeleteItems"], string.Empty);
            dialog.Commands.Add(new UICommand(Service.Current.Messages["Delete"], async c =>
            {
                await base.Execute(option);
            }));
            dialog.Commands.Add(new UICommand(Service.Current.Messages["Cancel"]));

            await dialog.ShowAsync();
        }
    }
}