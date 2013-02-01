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
    public class ProgramUnitItemTemplateSelector: DataTemplateSelector
    {
        protected override Windows.UI.Xaml.DataTemplate SelectTemplateCore(object obj, Windows.UI.Xaml.DependencyObject container)
        {
            if (obj == null)
                return null;

            var item = obj as ProgramUnitItem;
            DataTemplate template = null;
            if (item.Name == "AdministratorAddQueriesProgramUnit")
            {
                object resource;
                if (Application.Current.Resources.TryGetValue("AdministratorAddQueriesProgramUnit", out resource))
                    template = (DataTemplate)resource;
            }
            else
                ((Client)Client.Current).CustomTemplates[CustomTemplates.Type.ProgramUnitItems].Templates.TryGetValue(item.Name, out template);

            return template ?? (DataTemplate)Application.Current.Resources["DefaultProgramUnitItemTemplate"];
        }
    }
}