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
        public bool IsDetail { get; set; }

        protected override DataTemplate SelectTemplateCore(object obj, DependencyObject container)
        {
            var item = obj as QueryResultItem;

            DataTemplate template;
            if(!((Client)Client.Current).CustomTemplates[CustomTemplates.Type.QueryItems].Templates.TryGetValue(item.Query.PersistentObject.Type, out template))
            {
                var resourceName = IsDetail ? "DetailQueryItemTemplate" : "QueryItemTemplate";
                template = (DataTemplate)Application.Current.Resources[resourceName];
            }

            return template;
        }
    }
}