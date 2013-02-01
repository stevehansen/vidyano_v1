using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel.Actions;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.TemplateSelectors
{
    public class ActionIconTemplateSelector : DataTemplateSelector
    {
        protected override Windows.UI.Xaml.DataTemplate SelectTemplateCore(object obj, Windows.UI.Xaml.DependencyObject container)
        {
            var iconName = obj as string;
            if (string.IsNullOrEmpty(iconName))
                return new DataTemplate();

            object template;
            Client.Current.Resources.TryGetValue(iconName, out template);

            return template as DataTemplate ?? new DataTemplate();
        }
    }
}