using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Media;

namespace Vidyano.View.Common
{
    public static class FrameworkElementExtensions
    {
        public static FrameworkElement FindDescendantByName(this FrameworkElement element, string name)
        {
            return element.FindDescendantByCondition<FrameworkElement>(e => e.Name == name);
        }

        public static T FindDescendantByCondition<T>(this FrameworkElement element, Func<T, bool> condition = null)
            where T: class
        {
            if (element == null)
                return null;

            var t = element as T;
            if (t != null && (condition == null || condition(t)))
                return t;

            var childCount = VisualTreeHelper.GetChildrenCount(element);
            for (int i = 0; i < childCount; i++)
            {
                var result = (VisualTreeHelper.GetChild(element, i) as FrameworkElement).FindDescendantByCondition<T>(condition);
                if (result != null) { return result; }
            }

            return null;
        }
    }
}