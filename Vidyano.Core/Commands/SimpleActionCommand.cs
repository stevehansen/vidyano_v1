using System;
using System.Windows.Input;

namespace Vidyano.Commands
{
    class SimpleActionCommand : ICommand
    {
        private readonly Action<object> action;

        public SimpleActionCommand(Action<object> action)
        {
            this.action = action;
        }

        public bool CanExecute(object parameter)
        {
            return true;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        public void Execute(object parameter)
        {
            action(parameter);
        }
    }
}