namespace Vidyano.Commands
{
    public class ShowNotificationWithDialogCommand : ShowNotificationCommand
    {
        public override void Execute(object parameter)
        {
            if (!string.IsNullOrEmpty(parameter as string))
                ((StoreHooks)Service.Current.Hooks).ShowNotificationAsDialog(parameter as string, ViewModel.NotificationType.Error);
        }
    }
}