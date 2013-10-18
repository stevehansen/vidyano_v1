using System;
using System.Windows.Input;
using Vidyano.ViewModel;

namespace Vidyano.Commands
{
    public class RemoveTextSearchCommand : ICommand
    {
        public bool CanExecute(object parameter)
        {
            return true;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        public async void Execute(object parameter)
        {
            var query = parameter as Query;
            if (query != null)
                await query.SearchTextAsync(null);
        }
    }
}