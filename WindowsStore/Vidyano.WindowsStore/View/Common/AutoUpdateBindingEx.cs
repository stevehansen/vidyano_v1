using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.Common
{
    public static class AutoUpdateBindingEx
    {
        #region Dependency Properties

        public static readonly DependencyProperty AutoUpdateBindingProperty = DependencyProperty.RegisterAttached("AutoUpdateBinding", typeof(string), typeof(AutoUpdateBindingEx), new PropertyMetadata(string.Empty, OnAutoUpdateBindingChanged));
        public static readonly DependencyProperty IsAutoUpdateProperty = DependencyProperty.RegisterAttached("IsAutoUpdate", typeof(bool), typeof(AutoUpdateBindingEx), new PropertyMetadata(false, OnIsAutoUpdateChanged));

        private static readonly DependencyProperty IsAutoUpdateUpdatingProperty = DependencyProperty.RegisterAttached("IsAutoUpdateUpdating", typeof(bool), typeof(AutoUpdateBindingEx), new PropertyMetadata(false));

        #endregion

        #region Public Methods

        public static bool GetIsAutoUpdate(DependencyObject sender)
        {
            return (bool)sender.GetValue(IsAutoUpdateProperty);
        }

        public static void SetIsAutoUpdate(DependencyObject sender, bool value)
        {
            sender.SetValue(IsAutoUpdateProperty, value);
        }

        public static string GetAutoUpdateBinding(DependencyObject sender)
        {
            return (string)sender.GetValue(AutoUpdateBindingProperty);
        }

        public static void SetAutoUpdateBinding(DependencyObject sender, string value)
        {
            sender.SetValue(AutoUpdateBindingProperty, value);
        }

        private static bool GetIsAutoUpdateUpdating(DependencyObject sender)
        {
            return (bool)sender.GetValue(IsAutoUpdateUpdatingProperty);
        }

        private static void SetIsAutoUpdateUpdating(DependencyObject sender, bool value)
        {
            sender.SetValue(IsAutoUpdateUpdatingProperty, value);
        }

        #endregion

        #region Private Methods

        private static void OnAutoUpdateBindingChanged(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var textBox = sender as TextBox;
            var passwordBox = sender as PasswordBox;
            if ((textBox == null && passwordBox == null) || !GetIsAutoUpdate(sender))
                return;

            if (textBox != null)
                textBox.TextChanged -= HandleValueChanged;
            else if(passwordBox != null)
                passwordBox.PasswordChanged -= HandleValueChanged;

            var newValue = (string)e.NewValue;
            if (!GetIsAutoUpdateUpdating(sender))
            {
                if (textBox != null)
                    textBox.Text = newValue ?? String.Empty;
                else if (passwordBox != null)
                    passwordBox.Password = newValue ?? String.Empty;
            }

            if (textBox != null)
                textBox.TextChanged += HandleValueChanged;
            else if (passwordBox != null)
                passwordBox.PasswordChanged += HandleValueChanged;
        }

        private static void OnIsAutoUpdateChanged(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var textBox = sender as TextBox;
            var passwordBox = sender as PasswordBox;
            if (textBox == null && passwordBox == null)
                return;

            var wasBound = (bool)e.OldValue;
            var needToBind = (bool)e.NewValue;

            if (wasBound)
            {
                if (textBox != null)
                    textBox.TextChanged -= HandleValueChanged;
                else if (passwordBox != null)
                    passwordBox.PasswordChanged -= HandleValueChanged;
            }

            if (needToBind)
            {
                if (textBox != null)
                    textBox.TextChanged += HandleValueChanged;
                else if (passwordBox != null)
                    passwordBox.PasswordChanged += HandleValueChanged;
            }
        }

        private static void HandleValueChanged(object sender, RoutedEventArgs e)
        {
            var textBox = sender as TextBox;
            var passwordBox = sender as PasswordBox;
            if (textBox != null || passwordBox != null)
            {
                try
                {
                    SetIsAutoUpdateUpdating((DependencyObject)sender, true);
                    SetAutoUpdateBinding((DependencyObject)sender, textBox != null ? textBox.Text : passwordBox.Password);
                }
                finally
                {
                    SetIsAutoUpdateUpdating((DependencyObject)sender, false);
                }
            }
        }

        #endregion
    }
}