using System;
using System.Globalization;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Vidyano.ViewModel;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeNumeric : TextBox
    {
        private static readonly DependencyProperty NumberProperty = DependencyProperty.Register("Number", typeof(string), typeof(PersistentObjectAttributeNumeric), new PropertyMetadata(null, Number_Changed));

        private int caret;
        private Type clrType;
        private bool isNullableType;
        private Type numberType;
        private string text;

        public PersistentObjectAttributeNumeric()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeNumeric);
            SetBinding(NumberProperty, new Binding { Path = new PropertyPath("Value") });
            SetBinding(IsReadOnlyProperty, new Binding { Path = new PropertyPath("IsReadOnly") });

            InputScope = new InputScope { Names = { new InputScopeName(InputScopeNameValue.Number) } };

            PersistentObjectAttributeControlBase.SetHookDatavalidationStates(this, true);
            TextChanged += NumericTextBox_TextChanged;
        }

        protected override void OnKeyDown(KeyRoutedEventArgs e)
        {
            caret = SelectionStart;
            text = Text;

            base.OnKeyDown(e);
        }

        private void EnsureInitialized()
        {
            if (numberType != null)
                return;

            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null)
            {
                clrType = numberType = attr.ClrType;
                if (numberType.GenericTypeArguments.Length == 1 && numberType.Name == "Nullable`1")
                {
                    isNullableType = true;
                    numberType = numberType.GenericTypeArguments[0];
                }
            }
        }

        private static void Number_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var ctrl = sender as PersistentObjectAttributeNumeric;
            if (ctrl == null)
                return;

            try
            {
                ctrl.EnsureInitialized();

                var incomingVal = Convert.ChangeType(e.NewValue, ctrl.numberType);

                object textVal = null;
                if (ctrl.Text != string.Empty)
                {
                    try
                    {
                        textVal = Convert.ChangeType(ctrl.Text, ctrl.numberType);
                    }
                    catch {}
                }

                if (incomingVal != textVal)
                    ctrl.Text = incomingVal.ToString();
            }
            catch {}
        }

        private void NumericTextBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr == null)
                return;

            try
            {
                if (string.IsNullOrEmpty(Text))
                    return;

                EnsureInitialized();

                Text = Text.Replace(",", NumberFormatInfo.CurrentInfo.NumberDecimalSeparator).Replace(".", NumberFormatInfo.CurrentInfo.NumberDecimalSeparator);

                var val = Convert.ChangeType(Text, numberType);
                attr.Value = isNullableType ? Activator.CreateInstance(clrType, val) : val;

                SelectionStart = Text.Length;
            }
            catch
            {
                Text = text;
                SelectionStart = caret < Text.Length ? caret : 0;
            }
        }

        protected override void OnLostFocus(RoutedEventArgs e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr == null)
                return;

            if (attr.IsRequired && string.IsNullOrEmpty(Text))
                Text = "0";

            base.OnLostFocus(e);
        }
    }
}