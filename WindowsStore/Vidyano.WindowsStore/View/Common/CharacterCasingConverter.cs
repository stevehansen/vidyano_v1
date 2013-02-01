using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Common
{
    public class CharacterCasingConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            var str = value as string;
            if (!string.IsNullOrEmpty(str))
            {
                if ((string)parameter == "Upper")
                    return str.ToUpperInvariant();
                else if((string)parameter == "Lower")
                    return str.ToUpperInvariant();
            }

            return str;
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotImplementedException();
        }
    }
}
