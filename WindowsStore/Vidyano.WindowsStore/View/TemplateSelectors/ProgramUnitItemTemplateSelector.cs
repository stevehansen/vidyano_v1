﻿using System;
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
            var item = obj as ProgramUnitItem;
            if (item == null)
                return null;

            object template = null;
            Application.Current.Resources.TryGetValue("ProgramUnitItemTemplate." + item.Name, out template);

            return (DataTemplate)template ?? new DataTemplate();
        }
    }
}