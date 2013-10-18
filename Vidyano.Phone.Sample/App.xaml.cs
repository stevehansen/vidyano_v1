using System;
using System.Diagnostics;
using System.Resources;
using System.Windows;
using System.Windows.Markup;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;

namespace Vidyano.Phone.Sample
{
    public partial class App
    {
        /// <summary>
        /// Constructor for the Application object.
        /// </summary>
        public App()
        {
            InitializeComponent();
        }

        protected override PhoneHooks CreateHooks()
        {
            return new AppHooks();
        }
    }
}