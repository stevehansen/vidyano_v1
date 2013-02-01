using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeToggleSwitch: PersistentObjectAttributeControlBase
    {
        public static readonly DependencyProperty OnContentProperty = DependencyProperty.Register("OnContent", typeof(string), typeof(PersistentObjectAttributeToggleSwitch), new PropertyMetadata(null));
        public static readonly DependencyProperty OffContentProperty = DependencyProperty.Register("OffContent", typeof(string), typeof(PersistentObjectAttributeToggleSwitch), new PropertyMetadata(null));
        
        public PersistentObjectAttributeToggleSwitch()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeToggleSwitch);
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
    }
}
