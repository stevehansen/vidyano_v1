using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Vidyano.ViewModel;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributePassword : Control
    {
        private PasswordBox passwordBox;

        public PersistentObjectAttributePassword()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributePassword);

            Loaded += PersistentObjectAttributePassword_Loaded;
            Unloaded += PersistentObjectAttributePassword_Unloaded;
        }

        private void PersistentObjectAttributePassword_Loaded(object sender, RoutedEventArgs e)
        {
            passwordBox = (PasswordBox)GetTemplateChild("PasswordBox");
            if (passwordBox != null)
            {
                PersistentObjectAttributeControlBase.SetHookDatavalidationStates(passwordBox, true);
                passwordBox.PasswordChanged += PasswordBox_PasswordChanged;
            }
        }

        private void PersistentObjectAttributePassword_Unloaded(object sender, RoutedEventArgs e)
        {
            if (passwordBox != null)
                passwordBox.PasswordChanged -= PasswordBox_PasswordChanged;
        }

        private void PasswordBox_PasswordChanged(object sender, RoutedEventArgs e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null && !attr.IsReadOnly)
                attr.Value = passwordBox.Password;
        }
    }
}