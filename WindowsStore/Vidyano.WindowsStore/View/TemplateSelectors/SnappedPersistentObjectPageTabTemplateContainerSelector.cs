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
    public class SnappedPersistentObjectPageTabTemplateContainerSelector : DataTemplateSelector
    {
        protected override Windows.UI.Xaml.DataTemplate SelectTemplateCore(object obj, Windows.UI.Xaml.DependencyObject container)
        {
            DataTemplate template = null;
            var tab = (PersistentObjectTab)obj;

            if (tab != null)
            {
                if (obj is PersistentObjectTabAttributes)
                    template = (DataTemplate)Application.Current.Resources["SnappedPersistentObjectPageAttributeTabTemplateContainer"];
                else if (obj is PersistentObjectTabQuery)
                    template = (DataTemplate)Application.Current.Resources["SnappedPersistentObjectPageQueryTabTemplateContainer"];
            }

            return template ?? new DataTemplate();
        }
    }
}