using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.TemplateSelectors
{
    public class PersistentObjectPageTabTemplateSelector : DataTemplateSelector
    {
        protected override Windows.UI.Xaml.DataTemplate SelectTemplateCore(object obj, Windows.UI.Xaml.DependencyObject container)
        {
            DataTemplate template = null;
            var tab = (PersistentObjectTab)obj;

            if (tab != null)
            {
                if (!((Client)Client.Current).CustomTemplates[CustomTemplates.Type.PersistentObjects].Templates.TryGetValue(string.Format("{0}_Tab[{1}]", tab.Parent.Type, tab.Index), out template))
                {
                    if (obj is PersistentObjectTabAttributes)
                        template = (DataTemplate)Application.Current.Resources["PersistentObjectPageAttributeTabTemplate"];
                    else if (obj is PersistentObjectTabQuery)
                        template = (DataTemplate)Application.Current.Resources["PersistentObjectPageQueryTabTemplate"];
                }
            }

            return template ?? new DataTemplate();
        }
    }
}