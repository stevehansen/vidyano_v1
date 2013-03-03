using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.View.Common
{
    public interface IMultiValueConverter
    {
        object Convert(object[] values);
    }
}