using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Vidyano.View.Converters
{
    public class DefaultValueConverter: IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            if (targetType.GetTypeInfo().IsEnum)
                return Enum.Parse(targetType, System.Convert.ToString(value ?? parameter));

            return System.Convert.ChangeType(value ?? parameter, targetType);
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotImplementedException();
        }
    }
}