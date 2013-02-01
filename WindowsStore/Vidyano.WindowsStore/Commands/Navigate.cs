using System;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.ViewModel;

namespace Vidyano.Commands
{
    public class Navigate : ICommand
    {
        private Vidyano.ViewModel.NavigationContext.PageNavigationContextEntry localContext;

        public bool CanExecute(object parameter)
        {
            return parameter is Query || parameter is PersistentObject;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        public async Task Execute<T>(Task<T> task)
        {
            using (localContext = NavigationContext.Create())
            {
                ((ICommand)this).Execute(await task);
            }
        }

        void ICommand.Execute(object parameter)
        {
            using (var ctx = localContext ?? NavigationContext.Create())
            {
                var query = parameter as Query;
                if (query != null)
                    ctx.Navigate(typeof(View.QueryPage), Service.Current.AddCachedObject(query));
                else
                {
                    var po = parameter as PersistentObject;
                    if (po != null)
                        ctx.Navigate(typeof(View.PersistentObjectPage), Service.Current.AddCachedObject(po));
                }
            }
        }
    }
}