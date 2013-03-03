using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.TemplateSelectors
{
    public class QueryItemTemplateSelector : DataTemplateSelector
    {
        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
        {
            var item = obj as QueryResultItem;

            object template;
            if (item == null || !Application.Current.Resources.TryGetValue("QueryItemTemplate." + item.Query.PersistentObject.Type, out template))
                template = (DataTemplate)Application.Current.Resources["QueryItemTemplate.Default"];

            return (DataTemplate)template;
        }
    }
}