using System;
using System.Windows.Input;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.Commands
{
    public class GoHome : ICommand
    {
        public bool CanExecute(object parameter)
        {
            return true;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        public void Execute(object parameter)
        {
            var rootFrame = Window.Current.Content as Frame;
            if (rootFrame == null)
                return;

            while (rootFrame.BackStackDepth > 1 && rootFrame.CanGoBack)
                rootFrame.GoBack();
        }
    }
}