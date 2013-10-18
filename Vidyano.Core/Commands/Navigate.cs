using System;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.ViewModel;

namespace Vidyano.Commands
{
    public class Navigate : ICommand
    {
        private NavigationContext.PageNavigationContextEntry localContext;

        public bool CanExecute(object parameter)
        {
            return parameter is Query || parameter is PersistentObject;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        void ICommand.Execute(object parameter)
        {
            using (var ctx = localContext ?? NavigationContext.Create())
            {
                var query = parameter as Query;
                if (query != null)
                    ctx.Navigate(query);
                else
                {
                    var po = parameter as PersistentObject;
                    if (po != null)
                        ctx.Navigate(po);
                }
            }
        }

        public async Task Execute<T>(Task<T> task)
        {
            using (localContext = NavigationContext.Create())
                ((ICommand)this).Execute(await task);
        }

        private static class NavigationContext
        {
            private static PageNavigationContextEntry activeContext;

            public static PageNavigationContextEntry Create()
            {
                activeContext = new PageNavigationContextEntry();
                return activeContext;
            }

            public class PageNavigationContextEntry : IDisposable
            {
                public void Dispose() {}

                public void Navigate(Query query)
                {
                    if (activeContext == this)
                    {
                        Service.Current.Hooks.OnOpen(query);
                        activeContext = null;
                    }
                }

                public void Navigate(PersistentObject po)
                {
                    if (activeContext == this)
                    {
                        Service.Current.Hooks.OnOpen(po);
                        activeContext = null;
                    }
                }
            }
        }
    }
}