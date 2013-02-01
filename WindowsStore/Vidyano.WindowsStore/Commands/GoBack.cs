using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.View;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.Commands
{
    public class GoBack : ICommand
    {
        public bool CanExecute(object parameter)
        {
            var rootFrame = Window.Current.Content as Frame;
            return rootFrame != null && rootFrame.BackStackDepth > 1 ? rootFrame.CanGoBack : false;
        }

        public void Execute(object parameter)
        {
            ((Frame)Window.Current.Content).GoBack();
        }

        public event EventHandler CanExecuteChanged = delegate { };
    }
}