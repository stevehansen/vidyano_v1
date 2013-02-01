using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Markup;

namespace Vidyano
{
    public class CustomTemplates
    {
        internal enum Type
        {
            ProgramUnitItems,
            QueryItems,
            PersistentObjects
        }

        public CustomTemplates()
        {
            Templates = new Dictionary<string, DataTemplate>();
        }

        public Dictionary<string, DataTemplate> Templates { get; private set; }
    }
}