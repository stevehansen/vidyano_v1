using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Vidyano.ViewModel;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeString : TextBox
    {
        public PersistentObjectAttributeString()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeString);
            SetBinding(TextProperty, new Binding { Path = new PropertyPath("Value") });
            SetBinding(IsReadOnlyProperty, new Binding { Path = new PropertyPath("IsReadOnly") });

            PersistentObjectAttributeControlBase.SetHookDatavalidationStates(this, true);
            TextChanged += PersistentObjectAttributeString_TextChanged;
        }

        private void PersistentObjectAttributeString_TextChanged(object sender, TextChangedEventArgs e)
        {
            var attr = DataContext as PersistentObjectAttribute;
            if (attr != null)
                attr.Value = Text;
        }
    }
}