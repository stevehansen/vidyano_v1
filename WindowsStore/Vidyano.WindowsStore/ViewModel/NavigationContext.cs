using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.View;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.ViewModel
{
    public static class NavigationContext
    {
        private static PageNavigationContextEntry activeContext;

        public static PageNavigationContextEntry Create()
        {
            activeContext = new PageNavigationContextEntry();
            return activeContext;
        }

        public class PageNavigationContextEntry : IDisposable
        {
            public void Navigate(Type targetPage, object parameter)
            {
                if (activeContext == this)
                {
                    ((Frame)Window.Current.Content).Navigate(targetPage, parameter);
                    activeContext = null;
                }
            }

            public void Dispose()
            {
            }
        }
    }
}