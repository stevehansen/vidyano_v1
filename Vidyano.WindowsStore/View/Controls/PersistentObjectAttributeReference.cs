using Windows.UI.Xaml;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Vidyano.ViewModel;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeReference : PersistentObjectAttributeControlBase
    {
        private static readonly DependencyProperty SelectInPlaceProperty = DependencyProperty.Register("SelectInPlace", typeof(bool), typeof(PersistentObjectAttributeReference), new PropertyMetadata(false, SelectInPlace_Changed));

        public PersistentObjectAttributeReference()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeReference);

            SetBinding(SelectInPlaceProperty, new Binding { Path = new PropertyPath("SelectInPlace") });
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            VisualStateManager.GoToState(this, "Lookup", false);
            InvalidateLookupState();
        }

        protected override void OnTapped(TappedRoutedEventArgs e)
        {
            if (!(bool)GetValue(SelectInPlaceProperty))
                base.OnTapped(e);
        }

        private void InvalidateLookupState()
        {
            VisualStateManager.GoToState(this, ((PersistentObjectAttributeWithReference)DataContext).SelectInPlace ? "SelectInPlace" : "Lookup", false);
        }

        private static void SelectInPlace_Changed(DependencyObject sender, DependencyPropertyChangedEventArgs e)
        {
            var ctrl = sender as PersistentObjectAttributeReference;
            if (ctrl != null)
                ctrl.InvalidateLookupState();
        }
    }
}