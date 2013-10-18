using Windows.UI.Xaml;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeToggleSwitch : PersistentObjectAttributeControlBase
    {
        public static readonly DependencyProperty OnContentProperty = DependencyProperty.Register("OnContent", typeof(string), typeof(PersistentObjectAttributeToggleSwitch), new PropertyMetadata(null));
        public static readonly DependencyProperty OffContentProperty = DependencyProperty.Register("OffContent", typeof(string), typeof(PersistentObjectAttributeToggleSwitch), new PropertyMetadata(null));
        public static readonly DependencyProperty OnContentKeyProperty = DependencyProperty.Register("OnContentKey", typeof(string), typeof(PersistentObjectAttributeToggleSwitch), new PropertyMetadata(null, OnKeyChanged));
        public static readonly DependencyProperty OffContentKeyProperty = DependencyProperty.Register("OffContentKey", typeof(string), typeof(PersistentObjectAttributeToggleSwitch), new PropertyMetadata(null, OffKeyChanged));

        public PersistentObjectAttributeToggleSwitch()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeToggleSwitch);
        }

        public string OnContentKey
        {
            get { return (string)GetValue(OnContentKeyProperty); }
            set { SetValue(OnContentKeyProperty, value); }
        }

        public string OffContentKey
        {
            get { return (string)GetValue(OffContentKeyProperty); }
            set { SetValue(OffContentKeyProperty, value); }
        }

        public string OnContent
        {
            get { return (string)GetValue(OnContentProperty); }
            set { SetValue(OnContentProperty, value); }
        }

        public string OffContent
        {
            get { return (string)GetValue(OffContentProperty); }
            set { SetValue(OffContentProperty, value); }
        }

        private static void OnKeyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var toggle = d as PersistentObjectAttributeToggleSwitch;
            if (toggle != null)
                toggle.OnContent = Service.Current.Messages[(string)e.NewValue];
        }

        private static void OffKeyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var toggle = d as PersistentObjectAttributeToggleSwitch;
            if (toggle != null)
                toggle.OffContent = Service.Current.Messages[(string)e.NewValue];
        }
    }
}