using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Common
{
    public class StringFormatConverter: IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            return string.Format((string)parameter, System.Convert.ToString(value));
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotImplementedException();
        }
    }
}