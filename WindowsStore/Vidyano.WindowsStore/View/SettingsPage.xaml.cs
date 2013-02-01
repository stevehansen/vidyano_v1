using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.ApplicationSettings;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View
{
    public sealed partial class SettingsPage : UserControl
    {
        public const double PaneWidth = 341d;

        public SettingsPage()
        {
            this.InitializeComponent();
        }

        private void Back_Clicked(object sender, RoutedEventArgs e)
        {
            if (this.Parent.GetType() == typeof(Popup))
                ((Popup)this.Parent).IsOpen = false;

            SettingsPane.Show();
        }
    }
}