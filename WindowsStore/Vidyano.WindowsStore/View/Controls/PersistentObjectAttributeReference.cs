using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeReference : PersistentObjectAttributeControlBase
    {
        private static readonly DependencyProperty SelectInPlaceProperty = DependencyProperty.Register("SelectInPlace", typeof(bool), typeof(PersistentObjectAttributeReference), new PropertyMetadata(false, SelectInPlace_Changed));
        
        public PersistentObjectAttributeReference()
        {
            this.DefaultStyleKey = typeof(PersistentObjectAttributeReference);

            SetBinding(SelectInPlaceProperty, new Binding { Path = new PropertyPath("SelectInPlace") });
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            VisualStateManager.GoToState(this, "Lookup", false);
            InvalidateLookupState();
        }

        protected override void OnTapped(Windows.UI.Xaml.Input.TappedRoutedEventArgs e)
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
            if(ctrl != null)
                ctrl.InvalidateLookupState();
        }
    }
}