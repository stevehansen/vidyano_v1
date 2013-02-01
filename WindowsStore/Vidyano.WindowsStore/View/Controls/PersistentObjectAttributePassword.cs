using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributePassword: Control
    {
        private PasswordBox passwordBox;

        public PersistentObjectAttributePassword()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributePassword);

            Loaded += PersistentObjectAttributePassword_Loaded;
            Unloaded += PersistentObjectAttributePassword_Unloaded;
        }

        void PersistentObjectAttributePassword_Loaded(object sender, Windows.UI.Xaml.RoutedEventArgs e)
        {
            passwordBox = (PasswordBox)GetTemplateChild("PasswordBox");
            if (passwordBox != null)
            {
                PersistentObjectAttributeControlBase.SetHookDatavalidationStates(passwordBox, true);
                passwordBox.PasswordChanged += PasswordBox_PasswordChanged;
            }
        }

        void PersistentObjectAttributePassword_Unloaded(object sender, Windows.UI.Xaml.RoutedEventArgs e)
        {
            if(passwordBox != null)
                passwordBox.PasswordChanged -= PasswordBox_PasswordChanged;
        }

        private void PasswordBox_PasswordChanged(object sender, Windows.UI.Xaml.RoutedEventArgs e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null && !attr.IsReadOnly)
                attr.Value = passwordBox.Password;
        }
    }
}