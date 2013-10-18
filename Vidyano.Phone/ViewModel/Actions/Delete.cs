using System.Threading;
using System.Threading.Tasks;
using Microsoft.Phone.Controls;

namespace Vidyano.ViewModel.Actions
{
    sealed class Delete : QueryAction
    {
        public Delete(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
        }

        public override Task Execute(object option)
        {
            var messageBox = new CustomMessageBox
            {
                Caption = Service.Current.Messages["Delete"],
                Message = Service.Current.Messages["AskForDeleteItems"],
                LeftButtonContent = Service.Current.Messages["Delete"],
                RightButtonContent = Service.Current.Messages["Cancel"]
            };

            var waiter = new AutoResetEvent(false);
            messageBox.Dismissed += async (s1, e1) =>
            {
                if (e1.Result == CustomMessageBoxResult.LeftButton)
                    await base.Execute(option);

                waiter.Set();
            };

            messageBox.Show();

            return Task.Factory.StartNew(() => waiter.WaitOne());
        }
    }
}