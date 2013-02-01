using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Markup;

namespace Vidyano
{
    [ContentProperty(Name = "Template")]
    public class SettingsFlyout : NotifyableBase
    {
        private string _LabelMessageKey;
        private DataTemplate _Template;

        public string LabelMessageKey
        {
            get { return _LabelMessageKey; }
            set
            {
                SetProperty(ref _LabelMessageKey, value);
                OnPropertyChanged("Label");
            }
        }

        public string Label
        {
            get
            {
                return Service.Current.Messages[LabelMessageKey];
            }
        }

        public DataTemplate Template { get { return _Template; } set { SetProperty(ref _Template, value); } }

        public Settings Settings { get; internal set; }
    }
}
