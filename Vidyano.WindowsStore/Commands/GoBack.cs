using System;
using System.Windows.Input;
using Vidyano.ViewModel.Pages;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.Commands
{
    public class GoBack : ICommand
    {
        public bool CanExecute(object parameter)
        {
            if (parameter is HomePage || parameter is SignInPage || parameter is QueryItemSelectPage)
                return false;

            var rootFrame = Window.Current.Content as Frame;
            return rootFrame != null && rootFrame.BackStackDepth > 1 && rootFrame.CanGoBack;
        }

        public void Execute(object parameter)
        {
            ((Frame)Window.Current.Content).GoBack();
        }

        public event EventHandler CanExecuteChanged = delegate { };
    }
}