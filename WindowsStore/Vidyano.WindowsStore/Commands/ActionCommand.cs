using System;
using System.ComponentModel;
using System.Linq;
using System.Windows.Input;

namespace Vidyano.Commands
{
    public class ActionCommand : ICommand
    {
        private readonly Action<object> execute;
        private readonly Func<object, bool> canExecute;
        private readonly INotifyPropertyChanged objectToMonitor;
        private readonly string[] properties;

        private EventHandler _CanExecuteChanged = delegate { };

        public ActionCommand(Action<object> execute, Func<object, bool> canExecute, INotifyPropertyChanged objectToMonitor = null, params string[] properties)
        {
            this.execute = execute;
            this.canExecute = canExecute;
            this.objectToMonitor = objectToMonitor;
            this.properties = properties;

            if (objectToMonitor != null)
                objectToMonitor.PropertyChanged += ObjectToMonitor_PropertyChanged;
        }

        private void ObjectToMonitor_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (properties == null || properties != null && properties.Contains(e.PropertyName))
                _CanExecuteChanged(this, EventArgs.Empty);
        }

        bool ICommand.CanExecute(object parameter)
        {
            return canExecute(parameter);
        }

        event EventHandler ICommand.CanExecuteChanged
        {
            add { _CanExecuteChanged += value; }
            remove { _CanExecuteChanged -= value; }
        }

        void ICommand.Execute(object parameter)
        {
            execute(parameter);
        }
    }
}