using System;
using System.Windows.Input;
using Vidyano.ViewModel;

namespace Vidyano.Commands
{
    public class ShowNotificationCommand : ICommand
    {
        public bool CanExecute(object parameter)
        {
            return true;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        public virtual async void Execute(object parameter)
        {
            if (!string.IsNullOrEmpty(parameter as string))
                await Service.Current.Hooks.ShowNotification(parameter as string, NotificationType.Error);
        }
    }
}